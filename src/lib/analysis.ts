import { vecMat, invert, identity, matMul } from './linalg'
import type { Matrix, Vector } from './linalg'

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
  const transient = Array.from({ length: n }, (_, i) => i).filter((i) => !absorbing.has(i))
  const q = transient.map((i) => transient.map((j) => p[i][j]))
  const r = transient.map((i) => absorbingIdx.map((j) => p[i][j]))
  let nMat: Matrix
  try {
    nMat = invert(identity(transient.length).map((row, i) => row.map((x, j) => x - q[i][j])))
  } catch {
    throw new Error('Some states can never reach an absorbing state')
  }
  const b = matMul(nMat, r)
  const absorptionProbs = Array.from({ length: n }, () => Array(n).fill(0))
  const expectedSteps = Array(n).fill(0)
  absorbingIdx.forEach((i) => { absorptionProbs[i][i] = 1 })
  transient.forEach((ti, x) => {
    absorbingIdx.forEach((aj, y) => { absorptionProbs[ti][aj] = b[x][y] })
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
