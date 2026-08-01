import { describe, it, expect } from 'vitest'
import {
  advancePos,
  mulberry32,
  sampleDestination,
  stepPopulation,
  runSimulation,
} from './simulation'

const identity3 = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
]

describe('mulberry32', () => {
  it('is deterministic for a given seed', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })
  it('produces different streams for different seeds', () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)())
  })
  it('stays within [0, 1)', () => {
    const r = mulberry32(7)
    for (let i = 0; i < 200; i++) {
      const v = r()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('advancePos', () => {
  it('advances by the fraction of a period elapsed', () => {
    expect(advancePos(0, 600, 1200, 12)).toBeCloseTo(0.5, 9)
    expect(advancePos(2.5, 1200, 1200, 12)).toBeCloseTo(3.5, 9)
  })
  it('never runs past the last period', () => {
    expect(advancePos(11.9, 5000, 1200, 12)).toBe(12)
  })
  it('never steps backwards past the start on a negative delta', () => {
    // The first rAF timestamp can predate the performance.now() captured when
    // the loop was set up, yielding dt < 0 on the very first tick.
    expect(advancePos(0, -9, 1200, 12)).toBe(0)
  })
  it('ignores negative deltas rather than rewinding mid-run', () => {
    expect(advancePos(4, -50, 1200, 12)).toBe(4)
  })
})

describe('sampleDestination', () => {
  it('always picks the only reachable state', () => {
    expect(sampleDestination([0, 1, 0], 0)).toBe(1)
    expect(sampleDestination([0, 1, 0], 0.999)).toBe(1)
  })
  it('splits the unit interval by cumulative probability', () => {
    const row = [0.2, 0.5, 0.3]
    expect(sampleDestination(row, 0)).toBe(0)
    expect(sampleDestination(row, 0.19)).toBe(0)
    expect(sampleDestination(row, 0.2)).toBe(1)
    expect(sampleDestination(row, 0.69)).toBe(1)
    expect(sampleDestination(row, 0.7)).toBe(2)
    expect(sampleDestination(row, 0.99)).toBe(2)
  })
  it('falls back to the last state when rounding overshoots', () => {
    expect(sampleDestination([0.5, 0.5], 0.9999999999)).toBe(1)
  })
})

describe('stepPopulation', () => {
  it('keeps everyone in place under the identity matrix', () => {
    const { counts, moves } = stepPopulation([3, 0, 2], identity3, mulberry32(1))
    expect(counts).toEqual([3, 0, 2])
    expect(moves).toEqual([
      { from: 0, to: 0, count: 3 },
      { from: 2, to: 2, count: 2 },
    ])
  })
  it('conserves the total population', () => {
    const p = [
      [0.5, 0.3, 0.2],
      [0.1, 0.6, 0.3],
      [0.25, 0.25, 0.5],
    ]
    const { counts } = stepPopulation([10, 20, 30], p, mulberry32(99))
    expect(counts.reduce((a, b) => a + b, 0)).toBe(60)
  })
  it('emits moves whose outgoing counts match the source population', () => {
    const p = [
      [0.5, 0.5, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]
    const { moves } = stepPopulation([8, 4, 0], p, mulberry32(5))
    const out = (i: number) =>
      moves.filter((m) => m.from === i).reduce((a, m) => a + m.count, 0)
    expect(out(0)).toBe(8)
    expect(out(1)).toBe(4)
    expect(out(2)).toBe(0)
  })
  it('produces no moves for an empty population', () => {
    const { counts, moves } = stepPopulation([0, 0, 0], identity3, mulberry32(3))
    expect(counts).toEqual([0, 0, 0])
    expect(moves).toEqual([])
  })
})

describe('runSimulation', () => {
  it('returns periods + 1 frames, starting at the initial counts', () => {
    const frames = runSimulation([5, 0, 0], identity3, 4, mulberry32(1))
    expect(frames).toHaveLength(5)
    expect(frames[0].counts).toEqual([5, 0, 0])
  })
  it('leaves the final frame with no outgoing moves', () => {
    const frames = runSimulation([5, 0, 0], identity3, 3, mulberry32(1))
    expect(frames[frames.length - 1].moves).toEqual([])
  })
  it('conserves population across every frame', () => {
    const p = [
      [0.4, 0.4, 0.2],
      [0.1, 0.7, 0.2],
      [0, 0, 1],
    ]
    const frames = runSimulation([12, 8, 0], p, 10, mulberry32(2024))
    for (const f of frames) {
      expect(f.counts.reduce((a, b) => a + b, 0)).toBe(20)
    }
  })
  it('drains everyone into an absorbing state over enough periods', () => {
    // From 0 and 1 there is a steady leak into absorbing state 2.
    const p = [
      [0.5, 0, 0.5],
      [0, 0.5, 0.5],
      [0, 0, 1],
    ]
    const frames = runSimulation([30, 30, 0], p, 60, mulberry32(11))
    expect(frames[frames.length - 1].counts[2]).toBe(60)
  })
  it('is reproducible for a given seed', () => {
    const p = [
      [0.3, 0.4, 0.3],
      [0.3, 0.4, 0.3],
      [0.3, 0.4, 0.3],
    ]
    const a = runSimulation([9, 9, 9], p, 6, mulberry32(77))
    const b = runSimulation([9, 9, 9], p, 6, mulberry32(77))
    expect(a).toEqual(b)
  })
  it('supports zero periods', () => {
    const frames = runSimulation([1, 2, 3], identity3, 0, mulberry32(1))
    expect(frames).toHaveLength(1)
    expect(frames[0]).toEqual({ counts: [1, 2, 3], moves: [] })
  })
})
