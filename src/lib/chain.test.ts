import { describe, it, expect } from 'vitest'
import type { Chain } from './types'
import { buildMatrix, validateChain, absorbingStateIds, closedClasses } from './chain'

function mkChain(names: string[], rows: Record<string, Record<string, number>>): Chain {
  const states = names.map((name) => ({ id: name, name, position: { x: 0, y: 0 } }))
  const transitions = Object.entries(rows).flatMap(([from, tos]) =>
    Object.entries(tos).map(([to, probability]) => ({
      id: `${from}->${to}`, from, to, probability,
    })),
  )
  return { id: 'test', name: 'test', states, transitions }
}

describe('buildMatrix', () => {
  it('builds a row-stochastic matrix in state order, missing pairs are 0', () => {
    const c = mkChain(['A', 'B'], { A: { A: 0.9, B: 0.1 }, B: { A: 0.5, B: 0.5 } })
    expect(buildMatrix(c)).toEqual([[0.9, 0.1], [0.5, 0.5]])
  })
})

describe('validateChain', () => {
  it('accepts rows summing to 1', () => {
    const c = mkChain(['A', 'B'], { A: { A: 0.9, B: 0.1 }, B: { A: 0.5, B: 0.5 } })
    expect(validateChain(c).valid).toBe(true)
  })
  it('flags a row summing to 0.8 with its sum', () => {
    const c = mkChain(['A', 'B'], { A: { A: 0.3, B: 0.5 }, B: { B: 1 } })
    const v = validateChain(c)
    expect(v.valid).toBe(false)
    expect(v.rowSums['A']).toBeCloseTo(0.8, 12)
    expect(v.invalidStateIds).toEqual(['A'])
  })
  it('flags a state with no outgoing transitions (sum 0)', () => {
    const c = mkChain(['A', 'B'], { A: { B: 1 } })
    expect(validateChain(c).invalidStateIds).toEqual(['B'])
  })
  it('an empty chain is valid (nothing to compute yet)', () => {
    expect(validateChain(mkChain([], {})).valid).toBe(true)
  })
})

describe('absorbingStateIds', () => {
  it('detects a self-loop-1 state', () => {
    const c = mkChain(['A', 'B'], { A: { A: 0.5, B: 0.5 }, B: { B: 1 } })
    expect(absorbingStateIds(c)).toEqual(['B'])
  })
  it('a state with self-loop 1 plus another 0-prob transition is still absorbing', () => {
    const c = mkChain(['A', 'B'], { A: { A: 1, B: 0 }, B: { B: 1 } })
    expect(absorbingStateIds(c)).toEqual(['A', 'B'])
  })
})

describe('closedClasses', () => {
  it('one closed class in an irreducible chain', () => {
    const c = mkChain(['A', 'B'], { A: { A: 0.9, B: 0.1 }, B: { A: 0.5, B: 0.5 } })
    expect(closedClasses(c)).toHaveLength(1)
  })
  it('transient state feeding one recurrent class → one closed class', () => {
    const c = mkChain(['A', 'B'], { A: { A: 0.5, B: 0.5 }, B: { B: 1 } })
    expect(closedClasses(c)).toHaveLength(1)
  })
  it('two absorbing states → two closed classes', () => {
    const c = mkChain(['A', 'B', 'C'], { A: { B: 0.5, C: 0.5 }, B: { B: 1 }, C: { C: 1 } })
    expect(closedClasses(c)).toHaveLength(2)
  })
})
