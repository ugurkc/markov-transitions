import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Chain } from '../lib/types'
import { buildMatrix, validateChain } from '../lib/chain'
import {
  activePopulationSeries,
  advancePos,
  lerpCounts,
  lifetimeHistogram,
  mulberry32,
  runSimulation,
} from '../lib/simulation'
import type { Arrival, Move, SimFrame } from '../lib/simulation'

/** Milliseconds a single week takes to animate. */
const SPEED_MS = { slow: 2200, normal: 1200, fast: 600 }
export type SimSpeed = keyof typeof SPEED_MS
export const SIM_SPEEDS: SimSpeed[] = ['slow', 'normal', 'fast']

export const MAX_PLAYERS_PER_STATE = 999
export const MAX_WEEKS = 40
const DEFAULT_START_POPULATION = 100

export interface Simulation {
  /** False until the chain is valid, non-empty, and has both endpoints set. */
  runnable: boolean
  /** True once both an input and output state are chosen — independent of
   * chain validity, so the panel can tell the two failure reasons apart. */
  hasEndpoints: boolean
  frames: SimFrame[] | null
  /** Whole week currently displayed. */
  period: number
  /** 0..1 progress of the animation out of `period` into the next. */
  progress: number
  lastPeriod: number
  playing: boolean
  periods: number
  speed: SimSpeed
  /** Population per state at the start of the run, in `chain.states` order. */
  initialCounts: number[]
  /** New players joining the input state every week. */
  inputRate: number
  /** Population per state at the displayed week. */
  counts: number[]
  /**
   * Population blended toward the next week by `progress`, so the numbers
   * shown on the nodes drain and fill in step with the travelling players.
   */
  displayCounts: number[]
  /** Moves leaving the displayed week — what the overlay animates. */
  moves: Move[]
  /** New players joining the displayed week — what the overlay animates. */
  arrivals: Arrival[]
  /** "Still playing" (not in the output state) per week, 0..lastPeriod. */
  retentionSeries: number[]
  /**
   * Customer-lifetime histogram: bucket `w` is how many players' tenure
   * turned out to be exactly `w` weeks, for the *starting* cohort only (no
   * acquisition mixed in — see the shadow run this is computed from).
   */
  lifetimeCounts: number[]
  setCount: (stateId: string, n: number) => void
  setInputRate: (n: number) => void
  setPeriods: (n: number) => void
  setSpeed: (s: SimSpeed) => void
  play: () => void
  pause: () => void
  step: () => void
  reset: () => void
  reroll: () => void
}

const randomSeed = () => Math.floor(Math.random() * 2 ** 31)

export function useSimulation(chain: Chain): Simulation {
  const validation = useMemo(() => validateChain(chain), [chain])

  const inputIdx = chain.states.findIndex((s) => s.id === chain.inputStateId)
  const outputIdx = chain.states.findIndex((s) => s.id === chain.outputStateId)
  // Both endpoints must actually resolve to a state, not merely be set. An id
  // left behind by a deleted state is truthy but resolves to -1, which would
  // let the run proceed while retention silently fell back to the raw total
  // and every lifetime bucket came out empty.
  const hasEndpoints = inputIdx >= 0 && outputIdx >= 0
  const runnable = validation.valid && chain.states.length > 0 && hasEndpoints

  const [countsById, setCountsById] = useState<Record<string, number>>({})
  const [inputRate, setInputRateRaw] = useState(0)
  const [periods, setPeriodsRaw] = useState(12)
  const [speed, setSpeed] = useState<SimSpeed>('normal')
  const [seed, setSeed] = useState(randomSeed)
  /** Playback head as a float: whole part = week, fraction = animation progress. */
  const [pos, setPos] = useState(0)
  const [playing, setPlaying] = useState(false)

  const initialCounts = useMemo(
    () =>
      chain.states.map(
        (s, i) => countsById[s.id] ?? (i === 0 ? DEFAULT_START_POPULATION : 0),
      ),
    [chain.states, countsById],
  )

  const acquisition = useMemo(() => {
    const a = chain.states.map(() => 0)
    if (inputIdx >= 0) a[inputIdx] = inputRate
    return a
  }, [chain.states, inputIdx, inputRate])

  const matrix = useMemo(() => buildMatrix(chain), [chain])

  const frames = useMemo(
    () =>
      runnable
        ? runSimulation(initialCounts, matrix, periods, mulberry32(seed), acquisition)
        : null,
    [runnable, initialCounts, matrix, periods, seed, acquisition],
  )

  const retentionSeries = useMemo(
    () => (frames ? activePopulationSeries(frames, outputIdx) : []),
    [frames, outputIdx],
  )

  // A second, acquisition-free run of just the starting cohort. Mixing
  // acquisition into the lifetime histogram would land players who joined
  // at different weeks on the same absolute-week bucket despite having very
  // different actual tenures, so this tracks the starting cohort in
  // isolation — same seed, same matrix, just nobody topping it up.
  const shadowFrames = useMemo(
    () => (runnable ? runSimulation(initialCounts, matrix, periods, mulberry32(seed)) : null),
    [runnable, initialCounts, matrix, periods, seed],
  )

  const lifetimeCounts = useMemo(
    () => (shadowFrames ? lifetimeHistogram(shadowFrames, outputIdx) : []),
    [shadowFrames, outputIdx],
  )

  // What the run depends on. Node drags change `chain` but not this, so
  // rearranging the graph mid-run doesn't restart the animation.
  const signature = useMemo(
    () =>
      [
        chain.states.map((s) => s.id).join('|'),
        chain.transitions
          .map((t) => `${t.from}>${t.to}=${t.probability}`)
          .sort()
          .join(','),
        chain.inputStateId ?? '',
        chain.outputStateId ?? '',
        initialCounts.join(','),
        inputRate,
        periods,
        seed,
      ].join('::'),
    [
      chain.states,
      chain.transitions,
      chain.inputStateId,
      chain.outputStateId,
      initialCounts,
      inputRate,
      periods,
      seed,
    ],
  )

  // Set by play() just before it draws a new seed, so the rewind effect
  // below knows to keep playing through its own reset instead of pausing
  // the run it was asked to start.
  const resumeAfterResetRef = useRef(false)
  // Guards against React dev-mode's double effect invocation re-applying
  // (and thereby clobbering) resumeAfterResetRef for the same signature.
  const appliedSignatureRef = useRef<string | null>(null)

  // Rewind whenever the run itself changes — a half-played animation of a
  // chain that no longer exists would be misleading.
  useEffect(() => {
    if (appliedSignatureRef.current === signature) return
    appliedSignatureRef.current = signature
    setPos(0)
    setPlaying(resumeAfterResetRef.current)
    resumeAfterResetRef.current = false
  }, [signature])

  const lastPeriod = frames ? frames.length - 1 : 0

  useEffect(() => {
    if (!playing) return
    let raf = 0
    // Seeded from the first callback rather than performance.now(), since a
    // frame that already started would otherwise hand us a negative delta.
    let prev: number | null = null
    const tick = (now: number) => {
      const dt = prev === null ? 0 : now - prev
      prev = now
      setPos((p) => advancePos(p, dt, SPEED_MS[speed], lastPeriod))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, speed, lastPeriod])

  useEffect(() => {
    if (playing && pos >= lastPeriod) setPlaying(false)
  }, [playing, pos, lastPeriod])

  const period = Math.max(0, Math.min(Math.floor(pos), lastPeriod))
  const progress = pos - period

  const counts = frames ? frames[period].counts : initialCounts
  const displayCounts = frames
    ? lerpCounts(counts, frames[period + 1]?.counts ?? counts, progress)
    : initialCounts

  const setCount = useCallback((stateId: string, n: number) => {
    setCountsById((prev) => ({
      ...prev,
      [stateId]: Math.max(0, Math.min(MAX_PLAYERS_PER_STATE, Math.round(n))),
    }))
  }, [])

  const setInputRate = useCallback((n: number) => {
    setInputRateRaw(Math.max(0, Math.min(MAX_PLAYERS_PER_STATE, Math.round(n))))
  }, [])

  const setPeriods = useCallback((n: number) => {
    setPeriodsRaw(Math.max(1, Math.min(MAX_WEEKS, Math.round(n))))
  }, [])

  const play = useCallback(() => {
    // Starting a run from the beginning (fresh, reset, or replaying a
    // finished one) draws a new seed, so replays don't repeat the same
    // outcome. Resuming a paused mid-run animation keeps its seed.
    if (pos === 0 || pos >= lastPeriod) {
      resumeAfterResetRef.current = true
      setSeed(randomSeed())
      setPos(0)
    }
    setPlaying(true)
  }, [pos, lastPeriod])

  const pause = useCallback(() => setPlaying(false), [])

  const step = useCallback(() => {
    setPlaying(false)
    setPos((p) => Math.min(lastPeriod, Math.floor(p) + 1))
  }, [lastPeriod])

  const reset = useCallback(() => {
    setPlaying(false)
    setPos(0)
  }, [])

  const reroll = useCallback(() => setSeed(randomSeed()), [])

  return {
    runnable,
    hasEndpoints,
    frames,
    period,
    progress,
    lastPeriod,
    playing,
    periods,
    speed,
    initialCounts,
    inputRate,
    counts,
    displayCounts,
    moves: frames ? frames[period].moves : [],
    arrivals: frames ? frames[period].arrivals : [],
    retentionSeries,
    lifetimeCounts,
    setCount,
    setInputRate,
    setPeriods,
    setSpeed,
    play,
    pause,
    step,
    reset,
    reroll,
  }
}
