import { vecMat } from './linalg'
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
