import type { Matrix } from './linalg'

export type Rng = () => number

/**
 * Small deterministic PRNG (mulberry32). Seeding it keeps a run reproducible,
 * which is what lets "New run" mean something and keeps the tests stable.
 */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Advance the playback head by `dt` milliseconds, staying inside
 * [0, lastPeriod].
 *
 * `dt` is clamped at zero because the first requestAnimationFrame timestamp
 * can predate a `performance.now()` taken moments earlier — the callback
 * receives the time the frame *began*, so a loop started mid-frame otherwise
 * steps backwards and indexes off the front of the frame list.
 */
export function advancePos(
  pos: number,
  dt: number,
  msPerPeriod: number,
  lastPeriod: number,
): number {
  const step = Math.max(0, dt) / msPerPeriod
  return Math.max(0, Math.min(lastPeriod, pos + step))
}

/**
 * Blend two population snapshots for display partway through a period.
 *
 * Uses largest-remainder apportionment rather than plain rounding so the
 * on-screen numbers stay whole *and* keep adding up to the same total — a
 * cohort that briefly showed 101 of 100 players would undermine the whole
 * point of watching individuals move.
 */
export function lerpCounts(a: number[], b: number[], t: number): number[] {
  const raw = a.map((v, i) => v + ((b[i] ?? 0) - v) * t)
  const total = Math.round(raw.reduce((s, v) => s + v, 0))
  const out = raw.map((v) => Math.floor(v))
  let remainder = total - out.reduce((s, v) => s + v, 0)
  const byFraction = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((x, y) => y.frac - x.frac)
  for (let k = 0; k < byFraction.length && remainder > 0; k++) {
    out[byFraction[k].i]++
    remainder--
  }
  return out
}

/** One period's worth of players travelling from one state to another. */
export interface Move {
  from: number
  to: number
  count: number
}

export interface SimFrame {
  /** Population in each state at the start of this period. */
  counts: number[]
  /** Moves that carry this population into the next frame; empty on the last. */
  moves: Move[]
}

/**
 * Pick a destination by walking the row's cumulative probability against a
 * single uniform draw in [0, 1).
 */
export function sampleDestination(row: number[], r: number): number {
  let acc = 0
  for (let j = 0; j < row.length; j++) {
    acc += row[j]
    if (r < acc) return j
  }
  // Rounding can leave the cumulative sum a hair under r; the last state owns
  // that sliver rather than dropping the player.
  return row.length - 1
}

/** Roll every player in the population forward one period. */
export function stepPopulation(
  counts: number[],
  p: Matrix,
  rng: Rng,
): { counts: number[]; moves: Move[] } {
  const n = counts.length
  const next = Array<number>(n).fill(0)
  const grid = Array.from({ length: n }, () => Array<number>(n).fill(0))
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < counts[i]; k++) {
      const j = sampleDestination(p[i], rng())
      grid[i][j]++
      next[j]++
    }
  }
  const moves: Move[] = []
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (grid[i][j] > 0) moves.push({ from: i, to: j, count: grid[i][j] })
    }
  }
  return { counts: next, moves }
}

/**
 * Run an agent-based simulation for `periods` steps. Unlike the Forecast
 * panel — which computes exact expected proportions — this rolls the dice for
 * each individual player, so results wobble around the expectation the way a
 * real cohort does.
 *
 * Returns `periods + 1` frames: frame `t` holds the population at period `t`
 * and the moves that produce frame `t + 1`.
 */
export function runSimulation(
  initial: number[],
  p: Matrix,
  periods: number,
  rng: Rng,
): SimFrame[] {
  const frames: SimFrame[] = []
  let counts = initial.slice()
  for (let t = 0; t < periods; t++) {
    const { counts: nextCounts, moves } = stepPopulation(counts, p, rng)
    frames.push({ counts, moves })
    counts = nextCounts
  }
  frames.push({ counts, moves: [] })
  return frames
}
