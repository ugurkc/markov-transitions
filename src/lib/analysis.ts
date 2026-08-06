import { vecMat, invert, identity, matMul } from './linalg'
import type { Matrix, Vector } from './linalg'
import type { Chain } from './types'
import { absorbingStateIds, buildMatrix } from './chain'

/** Distributions after 0..n steps, starting from `start`. */
export function nStepForecast(p: Matrix, start: Vector, n: number): Vector[] {
  const out = [start]
  let v = start
  for (let i = 0; i < n; i++) {
    v = vecMat(v, p)
    out.push(v)
  }
  return out
}

export interface AbsorptionResult {
  /** absorptionProbs[i][j] = P(eventually absorbed at state j | start at i). 0 for non-absorbing j. */
  absorptionProbs: number[][]
  /** expectedSteps[i] = expected steps until absorption starting from i. */
  expectedSteps: number[]
}

export function absorptionAnalysis(p: Matrix, absorbingIdx: number[]): AbsorptionResult {
  const n = p.length
  const absorbing = new Set(absorbingIdx)
  const absorbingUnique = [...absorbing]
  for (const i of absorbingUnique) {
    if (Math.abs(p[i][i] - 1) > 1e-9) {
      throw new Error('absorbingIdx contains a non-absorbing state')
    }
  }
  const transient = Array.from({ length: n }, (_, i) => i).filter((i) => !absorbing.has(i))
  if (transient.length === 0) {
    // Every state is absorbing: each absorbs at itself immediately.
    const absorptionProbs = Array.from({ length: n }, () => Array<number>(n).fill(0))
    absorbingUnique.forEach((i) => { absorptionProbs[i][i] = 1 })
    return { absorptionProbs, expectedSteps: Array<number>(n).fill(0) }
  }
  const q = transient.map((i) => transient.map((j) => p[i][j]))
  const r = transient.map((i) => absorbingUnique.map((j) => p[i][j]))
  let nMat: Matrix
  try {
    nMat = invert(identity(transient.length).map((row, i) => row.map((x, j) => x - q[i][j])))
  } catch (err) {
    if (err instanceof Error && err.message === 'Matrix is singular') {
      throw new Error('Some states can never reach an absorbing state')
    }
    throw err
  }
  const b = matMul(nMat, r)
  const absorptionProbs = Array.from({ length: n }, () => Array(n).fill(0))
  const expectedSteps = Array(n).fill(0)
  absorbingUnique.forEach((i) => { absorptionProbs[i][i] = 1 })
  transient.forEach((ti, x) => {
    absorbingUnique.forEach((aj, y) => { absorptionProbs[ti][aj] = b[x][y] })
    expectedSteps[ti] = nMat[x].reduce((a, v) => a + v, 0)
  })
  return { absorptionProbs, expectedSteps }
}

/**
 * Expected weeks from the chain's input state to its output state — the
 * exact closed-form number, not a simulated average. Only defined when the
 * output state is actually absorbing (a one-way door): "expected steps to
 * absorption" isn't meaningful when players can leave and come back, and a
 * custom chain can have a state that never reaches the output at all, in
 * which case there's no single expected value either. Both cases return
 * null rather than a misleading number.
 */
export function expectedTenure(chain: Chain): number | null {
  const inputIdx = chain.states.findIndex((s) => s.id === chain.inputStateId)
  const outputIdx = chain.states.findIndex((s) => s.id === chain.outputStateId)
  if (inputIdx < 0 || outputIdx < 0) return null
  if (!absorbingStateIds(chain).includes(chain.states[outputIdx].id)) return null
  try {
    return absorptionAnalysis(buildMatrix(chain), [outputIdx]).expectedSteps[inputIdx]
  } catch {
    return null
  }
}

export interface SteadyStateResult {
  distribution: Vector
  converged: boolean
}

/**
 * Where a cohort starting at `start` ends up in the long run: the forecast
 * with the step count taken to infinity.
 *
 * Power-iterates the lazy chain (P+I)/2, which shares P's stationary
 * distribution but is always aperiodic. That matters because a periodic
 * chain's own forecast never settles (a 2-cycle just alternates forever);
 * the lazy chain converges to the *time-average* share of each state, which
 * is the meaningful answer to "where do players spend their time."
 *
 * Iterating from the caller's actual start vector rather than a uniform one
 * also makes the reducible case correct: with two or more closed classes the
 * long-run mix genuinely depends on where players began, and this returns
 * that answer instead of an averaged-over-nothing fiction.
 */
export function longRunDistribution(
  p: Matrix,
  start: Vector,
  maxIter = 100_000,
  tol = 1e-12,
): SteadyStateResult {
  const lazy = p.map((row, i) => row.map((x, j) => (x + (i === j ? 1 : 0)) / 2))
  let v: Vector = start.slice()
  for (let it = 0; it < maxIter; it++) {
    const nv = vecMat(v, lazy)
    const diff = nv.reduce((s, x, i) => s + Math.abs(x - v[i]), 0)
    v = nv
    if (diff < tol) return { distribution: v, converged: true }
  }
  return { distribution: v, converged: false }
}

/**
 * Stationary distribution from a uniform start.
 *
 * The caller must ensure the chain has exactly one closed class (via
 * `closedClasses`); with two or more, the result is a start-dependent
 * mixture (here: the uniform-start limit), not "the" stationary distribution.
 */
export function steadyState(p: Matrix, maxIter = 100_000, tol = 1e-12): SteadyStateResult {
  return longRunDistribution(p, Array(p.length).fill(1 / p.length), maxIter, tol)
}

/**
 * Does this chain's forecast keep oscillating instead of settling down?
 *
 * True for periodic chains: a 2-cycle alternates between states forever, so
 * no step count is "the answer" and the infinite-horizon figure is a
 * time-average rather than a destination. Detected empirically — run far
 * enough out that a converging chain's consecutive steps are indistinguishable,
 * then check whether one more step still moves anything.
 */
export function forecastOscillates(
  p: Matrix,
  start: Vector,
  probeSteps = 512,
  tol = 1e-6,
): boolean {
  let v: Vector = start.slice()
  for (let i = 0; i < probeSteps; i++) v = vecMat(v, p)
  const next = vecMat(v, p)
  return next.reduce((s, x, i) => s + Math.abs(x - v[i]), 0) > tol
}

export interface DiagnosticsRow {
  stateId: string
  stickiness: number
  topOutbound: { toId: string; probability: number } | null
  dropOff: number | null
}

/**
 * Per-state diagnostics: self-loop probability, strongest outbound transition
 * to a different state, and direct probability into the risk state.
 *
 * An unknown `riskStateId` behaves like `null` (dropOff is null). Ties in
 * outbound probability resolve to the lowest state index.
 */
export function diagnostics(chain: Chain, riskStateId: string | null): DiagnosticsRow[] {
  const m = buildMatrix(chain)
  const riskIdx = riskStateId ? chain.states.findIndex((s) => s.id === riskStateId) : -1
  return chain.states.map((s, i) => {
    let top: DiagnosticsRow['topOutbound'] = null
    m[i].forEach((prob, j) => {
      if (j !== i && prob > 0 && (!top || prob > top.probability)) {
        top = { toId: chain.states[j].id, probability: prob }
      }
    })
    return {
      stateId: s.id,
      stickiness: m[i][i],
      topOutbound: top,
      dropOff: riskIdx >= 0 ? m[i][riskIdx] : null,
    }
  })
}
