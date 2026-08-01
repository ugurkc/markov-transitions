import { describe, it, expect } from 'vitest'
import { identity, matMul, vecMat, invert } from './linalg'

describe('identity', () => {
  it('builds an n×n identity', () => {
    expect(identity(2)).toEqual([[1, 0], [0, 1]])
  })
})

describe('matMul', () => {
  it('multiplies two matrices', () => {
    expect(matMul([[1, 2], [3, 4]], [[5, 6], [7, 8]])).toEqual([[19, 22], [43, 50]])
  })
})

describe('vecMat', () => {
  it('multiplies row vector by matrix', () => {
    expect(vecMat([1, 0], [[0.9, 0.1], [0.5, 0.5]])).toEqual([0.9, 0.1])
  })
})

describe('invert', () => {
  it('inverts a 2×2 matrix (Gauss-Jordan)', () => {
    const inv = invert([[2, 1], [1, 1]])
    expect(inv[0][0]).toBeCloseTo(1, 12)
    expect(inv[0][1]).toBeCloseTo(-1, 12)
    expect(inv[1][0]).toBeCloseTo(-1, 12)
    expect(inv[1][1]).toBeCloseTo(2, 12)
  })
  it('A · A⁻¹ = I for a 3×3', () => {
    const A = [[2, 0, 1], [1, 3, 0], [0, 1, 4]]
    const prod = matMul(A, invert(A))
    const I = identity(3)
    prod.forEach((row, i) => row.forEach((x, j) => expect(x).toBeCloseTo(I[i][j], 10)))
  })
  it('throws on a singular matrix', () => {
    expect(() => invert([[1, 2], [2, 4]])).toThrow()
  })
})
