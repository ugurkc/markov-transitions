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
  it('sums duplicate (from,to) transitions', () => {
    const c = mkChain(['A', 'B'], { B: { B: 1 } })
    c.transitions.push(
      { id: 't1', from: 'A', to: 'B', probability: 0.3 },
      { id: 't2', from: 'A', to: 'B', probability: 0.4 },
    )
    expect(buildMatrix(c)[0][1]).toBeCloseTo(0.7, 12)
  })
  it('skips transitions referencing unknown state ids', () => {
    const c = mkChain(['A', 'B'], { A: { A: 1 }, B: { B: 1 } })
    c.transitions.push(
      { id: 'tx', from: 'X', to: 'A', probability: 0.5 },
      { id: 'ty', from: 'A', to: 'Z', probability: 0.5 },
    )
    expect(buildMatrix(c)).toEqual([[1, 0], [0, 1]])
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
  it('flags out-of-range probabilities even when the row sums to 1', () => {
    const c = mkChain(['A', 'B'], { A: { A: 1.5, B: -0.5 }, B: { B: 1 } })
    const v = validateChain(c)
    expect(v.valid).toBe(false)
    expect(v.rowSums['A']).toBeCloseTo(1, 12)
    expect(v.invalidStateIds).toEqual(['A'])
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
  const normalize = (classes: string[][]) =>
    classes.map((c) => [...c].sort()).sort((a, b) => a[0].localeCompare(b[0]))

  it('one closed class in an irreducible chain', () => {
    const c = mkChain(['A', 'B'], { A: { A: 0.9, B: 0.1 }, B: { A: 0.5, B: 0.5 } })
    expect(normalize(closedClasses(c))).toEqual([['A', 'B']])
  })
  it('transient state feeding one recurrent class → one closed class, transient excluded', () => {
    const c = mkChain(['A', 'B'], { A: { A: 0.5, B: 0.5 }, B: { B: 1 } })
    expect(normalize(closedClasses(c))).toEqual([['B']])
  })
  it('two absorbing states → two closed classes, transient excluded', () => {
    const c = mkChain(['A', 'B', 'C'], { A: { B: 0.5, C: 0.5 }, B: { B: 1 }, C: { C: 1 } })
    expect(normalize(closedClasses(c))).toEqual([['B'], ['C']])
  })
})
