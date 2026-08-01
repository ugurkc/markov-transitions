import { vecMat, invert, identity, matMul } from './linalg'
import type { Matrix, Vector } from './linalg'
import type { Chain } from './types'
import { buildMatrix } from './chain'

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

export interface SteadyStateResult {
  distribution: Vector
  converged: boolean
}

/**
 * Stationary distribution by power iteration on the lazy chain (P+I)/2,
 * which has the same stationary distribution and is always aperiodic.
 *
 * The caller must ensure the chain has exactly one closed class (via
 * `closedClasses`); with two or more, the result is a start-dependent
 * mixture (here: the uniform-start limit), not "the" stationary distribution.
 */
export function steadyState(p: Matrix, maxIter = 100_000, tol = 1e-12): SteadyStateResult {
  const n = p.length
  const lazy = p.map((row, i) => row.map((x, j) => (x + (i === j ? 1 : 0)) / 2))
  let v: Vector = Array(n).fill(1 / n)
  for (let it = 0; it < maxIter; it++) {
    const nv = vecMat(v, lazy)
    const diff = nv.reduce((s, x, i) => s + Math.abs(x - v[i]), 0)
    v = nv
    if (diff < tol) return { distribution: v, converged: true }
  }
  return { distribution: v, converged: false }
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
