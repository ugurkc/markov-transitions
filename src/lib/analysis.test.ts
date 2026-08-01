import { describe, it, expect } from 'vitest'
import { nStepForecast } from './analysis'

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
