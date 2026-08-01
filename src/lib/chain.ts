import type { Chain } from './types'
import type { Matrix } from './linalg'

export const PROB_TOLERANCE = 1e-9

export interface ValidationResult {
  valid: boolean
  rowSums: Record<string, number>
  invalidStateIds: string[]
}

/** Row-stochastic matrix in chain.states order; absent transitions are 0. */
export function buildMatrix(chain: Chain): Matrix {
  const index = new Map(chain.states.map((s, i) => [s.id, i]))
  const n = chain.states.length
  const m: Matrix = Array.from({ length: n }, () => Array<number>(n).fill(0))
  for (const t of chain.transitions) {
    const i = index.get(t.from)
    const j = index.get(t.to)
    if (i === undefined || j === undefined) continue
    m[i][j] += t.probability
  }
  return m
}

/** Every row must sum to 1 within PROB_TOLERANCE; an empty chain is valid. */
export function validateChain(chain: Chain): ValidationResult {
  const matrix = buildMatrix(chain)
  const rowSums: Record<string, number> = {}
  const invalidStateIds: string[] = []
  chain.states.forEach((s, i) => {
    const sum = matrix[i].reduce((acc, x) => acc + x, 0)
    rowSums[s.id] = sum
    if (Math.abs(sum - 1) > PROB_TOLERANCE) invalidStateIds.push(s.id)
  })
  return { valid: invalidStateIds.length === 0, rowSums, invalidStateIds }
}

/** Absorbing = all outgoing probability mass on the self-loop (diagonal ≈ 1, off-diagonals ≤ tolerance). */
export function absorbingStateIds(chain: Chain): string[] {
  const matrix = buildMatrix(chain)
  return chain.states
    .filter((_, i) =>
      Math.abs(matrix[i][i] - 1) <= PROB_TOLERANCE &&
      matrix[i].every((x, j) => j === i || x <= PROB_TOLERANCE),
    )
    .map((s) => s.id)
}

/**
 * Closed communicating classes (recurrent classes) via mutual reachability.
 * Exactly one closed class ⇒ unique stationary distribution.
 */
export function closedClasses(chain: Chain): string[][] {
  const matrix = buildMatrix(chain)
  const n = chain.states.length

  // reach[i][j]: state j is reachable from state i (including i itself)
  const reach: boolean[][] = Array.from({ length: n }, (_, i) => {
    const seen = Array<boolean>(n).fill(false)
    seen[i] = true
    const stack = [i]
    while (stack.length > 0) {
      const cur = stack.pop()!
      for (let j = 0; j < n; j++) {
        if (!seen[j] && matrix[cur][j] > PROB_TOLERANCE) {
          seen[j] = true
          stack.push(j)
        }
      }
    }
    return seen
  })

  const assigned = Array<boolean>(n).fill(false)
  const classes: string[][] = []
  for (let i = 0; i < n; i++) {
    if (assigned[i]) continue
    const members: number[] = []
    for (let j = 0; j < n; j++) {
      if (reach[i][j] && reach[j][i]) members.push(j)
    }
    for (const j of members) assigned[j] = true
    const inClass = new Set(members)
    const closed = members.every((j) =>
      matrix[j].every((x, k) => x <= PROB_TOLERANCE || inClass.has(k)),
    )
    if (closed) classes.push(members.map((j) => chain.states[j].id))
  }
  return classes
}
