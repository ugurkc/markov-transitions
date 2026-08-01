import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Chain } from '../lib/types'
import { buildMatrix, validateChain } from '../lib/chain'
import {
  activePopulationSeries,
  advancePos,
  lerpCounts,
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
  const hasEndpoints = !!chain.inputStateId && !!chain.outputStateId
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

  const inputIdx = chain.states.findIndex((s) => s.id === chain.inputStateId)
  const outputIdx = chain.states.findIndex((s) => s.id === chain.outputStateId)

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

  // Rewind whenever the run itself changes — a half-played animation of a
  // chain that no longer exists would be misleading.
  useEffect(() => {
    setPos(0)
    setPlaying(false)
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
    setPos((p) => (p >= lastPeriod ? 0 : p))
    setPlaying(true)
  }, [lastPeriod])

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
