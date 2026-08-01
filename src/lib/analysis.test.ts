import { describe, it, expect } from 'vitest'
import { nStepForecast, absorptionAnalysis, steadyState, diagnostics } from './analysis'
import type { Chain } from './types'

function mkChain(names: string[], rows: Record<string, Record<string, number>>): Chain {
  const states = names.map((name) => ({ id: name, name, position: { x: 0, y: 0 } }))
  const transitions = Object.entries(rows).flatMap(([from, tos]) =>
    Object.entries(tos).map(([to, probability]) => ({
      id: `${from}->${to}`, from, to, probability,
    })),
  )
  return { id: 'test', name: 'test', states, transitions }
}

const weather = [[0.9, 0.1], [0.5, 0.5]]

describe('nStepForecast', () => {
  it('returns distributions for steps 0..N', () => {
    const steps = nStepForecast(weather, [1, 0], 2)
    expect(steps).toHaveLength(3)
    expect(steps[0]).toEqual([1, 0])
    expect(steps[1][0]).toBeCloseTo(0.9, 12)
    expect(steps[2][0]).toBeCloseTo(0.86, 12) // 0.9·0.9 + 0.1·0.5
    expect(steps[2][1]).toBeCloseTo(0.14, 12)
  })
})

// States: s0 (absorbing), s1, s2, s3 (absorbing); p=0.5 each direction.
// Matrix order: s0, s1, s2, s3.
const drunkard = [
  [1, 0, 0, 0],
  [0.5, 0, 0.5, 0],
  [0, 0.5, 0, 0.5],
  [0, 0, 0, 1],
]

describe('absorptionAnalysis', () => {
  const r = absorptionAnalysis(drunkard, [0, 3]) // absorbing indices
  it('computes absorption probabilities B = N·R', () => {
    // from s1: P(absorb at s0) = 2/3, P(absorb at s3) = 1/3
    expect(r.absorptionProbs[1][0]).toBeCloseTo(2 / 3, 12)
    expect(r.absorptionProbs[1][3]).toBeCloseTo(1 / 3, 12)
    expect(r.absorptionProbs[2][0]).toBeCloseTo(1 / 3, 12)
    expect(r.absorptionProbs[2][3]).toBeCloseTo(2 / 3, 12)
  })
  it('computes expected steps to absorption t = N·1', () => {
    expect(r.expectedSteps[1]).toBeCloseTo(2, 12)
    expect(r.expectedSteps[2]).toBeCloseTo(2, 12)
  })
  it('absorbing states absorb at themselves in 0 steps', () => {
    expect(r.absorptionProbs[0][0]).toBe(1)
    expect(r.expectedSteps[0]).toBe(0)
  })
  it('throws when a transient state can never reach an absorbing state', () => {
    // s0 absorbing; s1 and s2 form a closed cycle that never reaches s0.
    const cycle = [
      [1, 0, 0],
      [0, 0, 1],
      [0, 1, 0],
    ]
    expect(() => absorptionAnalysis(cycle, [0])).toThrowError(
      'Some states can never reach an absorbing state',
    )
  })
})

describe('steadyState', () => {
  it('weather chain converges to [5/6, 1/6]', () => {
    const r = steadyState([[0.9, 0.1], [0.5, 0.5]])
    expect(r.converged).toBe(true)
    expect(r.distribution[0]).toBeCloseTo(5 / 6, 8)
    expect(r.distribution[1]).toBeCloseTo(1 / 6, 8)
  })
  it('handles a periodic chain via lazy-chain damping (A↔B → [1/2, 1/2])', () => {
    const r = steadyState([[0, 1], [1, 0]])
    expect(r.converged).toBe(true)
    expect(r.distribution[0]).toBeCloseTo(0.5, 8)
  })
})

describe('diagnostics', () => {
  const c = mkChain(['T', 'L', 'C'], {
    T: { T: 0.5, L: 0.3, C: 0.2 },
    L: { L: 0.6, T: 0.25, C: 0.15 },
    C: { C: 1 },
  })
  it('reports stickiness (self-loop), top outbound, and drop-off to the risk state', () => {
    const d = diagnostics(c, 'C')
    const t = d.find((row) => row.stateId === 'T')!
    expect(t.stickiness).toBeCloseTo(0.5, 12)
    expect(t.topOutbound).toEqual({ toId: 'L', probability: 0.3 })
    expect(t.dropOff).toBeCloseTo(0.2, 12)
  })
  it('risk state omitted → dropOff is null', () => {
    expect(diagnostics(c, null)[0].dropOff).toBeNull()
  })
})
