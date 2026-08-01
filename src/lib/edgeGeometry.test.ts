import { describe, it, expect } from 'vitest'
import { borderPoint, edgeGeometry, pathD, pointAt } from './edgeGeometry'
import type { Rect } from './edgeGeometry'

const rect = (cx: number, cy: number, w = 100, h = 40): Rect => ({ cx, cy, w, h })

describe('borderPoint', () => {
  it('exits through the right edge when the target is due east', () => {
    const p = borderPoint(rect(0, 0), 500, 0, 0)
    expect(p).toEqual({ x: 50, y: 0 })
  })
  it('exits through the top edge when the target is due north', () => {
    const p = borderPoint(rect(0, 0), 0, -500, 0)
    expect(p).toEqual({ x: 0, y: -20 })
  })
  it('adds the padding outside the border', () => {
    expect(borderPoint(rect(0, 0), 500, 0, 3).x).toBe(53)
  })
  it('returns the center when the target is the center itself', () => {
    expect(borderPoint(rect(7, 9), 7, 9, 0)).toEqual({ x: 7, y: 9 })
  })
})

describe('edgeGeometry', () => {
  it('draws a straight line between two plain nodes', () => {
    const g = edgeGeometry(rect(0, 0), rect(400, 0), { selfLoop: false, hasReverse: false })
    expect(g.kind).toBe('line')
  })
  it('bows into a quadratic curve when a reverse edge exists', () => {
    const g = edgeGeometry(rect(0, 0), rect(400, 0), { selfLoop: false, hasReverse: true })
    expect(g.kind).toBe('quad')
  })
  it('bows opposite ways for the two directions of a pair', () => {
    const ab = edgeGeometry(rect(0, 0), rect(400, 0), { selfLoop: false, hasReverse: true })
    const ba = edgeGeometry(rect(400, 0), rect(0, 0), { selfLoop: false, hasReverse: true })
    const mAb = pointAt(ab, 0.5)
    const mBa = pointAt(ba, 0.5)
    // One midpoint sits above the axis, the other below.
    expect(Math.sign(mAb.y)).toBe(-Math.sign(mBa.y))
    expect(mAb.y).not.toBe(0)
  })
  it('uses a cubic arc for self-loops', () => {
    const g = edgeGeometry(rect(0, 0), rect(0, 0), { selfLoop: true, hasReverse: false })
    expect(g.kind).toBe('cubic')
  })
})

describe('pathD', () => {
  it('emits an SVG line command', () => {
    const g = edgeGeometry(rect(0, 0), rect(400, 0), { selfLoop: false, hasReverse: false })
    expect(pathD(g)).toMatch(/^M .* L /)
  })
  it('emits an SVG quadratic command', () => {
    const g = edgeGeometry(rect(0, 0), rect(400, 0), { selfLoop: false, hasReverse: true })
    expect(pathD(g)).toMatch(/^M .* Q /)
  })
  it('emits an SVG cubic command', () => {
    const g = edgeGeometry(rect(0, 0), rect(0, 0), { selfLoop: true, hasReverse: false })
    expect(pathD(g)).toMatch(/^M .* C /)
  })
})

describe('pointAt', () => {
  it('returns the endpoints at t = 0 and t = 1 for every geometry kind', () => {
    const cases = [
      edgeGeometry(rect(0, 0), rect(400, 0), { selfLoop: false, hasReverse: false }),
      edgeGeometry(rect(0, 0), rect(400, 0), { selfLoop: false, hasReverse: true }),
      edgeGeometry(rect(0, 0), rect(0, 0), { selfLoop: true, hasReverse: false }),
    ]
    for (const g of cases) {
      const a = g.kind === 'line' ? g.a : g.a
      const b = g.kind === 'line' ? g.b : g.b
      expect(pointAt(g, 0).x).toBeCloseTo(a.x, 9)
      expect(pointAt(g, 0).y).toBeCloseTo(a.y, 9)
      expect(pointAt(g, 1).x).toBeCloseTo(b.x, 9)
      expect(pointAt(g, 1).y).toBeCloseTo(b.y, 9)
    }
  })
  it('lands on the midpoint of a straight line at t = 0.5', () => {
    const g = edgeGeometry(rect(0, 0), rect(400, 0), { selfLoop: false, hasReverse: false })
    expect(pointAt(g, 0.5)).toEqual({ x: 200, y: 0 })
  })
  it('advances monotonically along a straight line', () => {
    const g = edgeGeometry(rect(0, 0), rect(400, 0), { selfLoop: false, hasReverse: false })
    let prev = -Infinity
    for (let t = 0; t <= 1; t += 0.1) {
      const x = pointAt(g, t).x
      expect(x).toBeGreaterThan(prev)
      prev = x
    }
  })
  it('travels away from the node and back again along a self-loop', () => {
    const g = edgeGeometry(rect(0, 0), rect(0, 0), { selfLoop: true, hasReverse: false })
    const start = pointAt(g, 0)
    const mid = pointAt(g, 0.5)
    const end = pointAt(g, 1)
    expect(mid.x).toBeGreaterThan(start.x)
    expect(mid.x).toBeGreaterThan(end.x)
  })
})
