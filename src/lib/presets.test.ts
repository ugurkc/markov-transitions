import { describe, it, expect } from 'vitest'
import { funnelPreset, winBackPreset } from './presets'
import { validateChain, absorbingStateIds, closedClasses, buildMatrix } from './chain'
import { absorptionAnalysis, steadyState } from './analysis'

describe('funnel preset (Tutorial/Leveling/Endgame/Churned, Churned absorbing)', () => {
  it('is valid and has exactly Churned absorbing', () => {
    expect(validateChain(funnelPreset).valid).toBe(true)
    expect(absorbingStateIds(funnelPreset)).toEqual(['churned'])
  })
  it('expected steps to churn: Tutorial 6, Leveling 20/3, Endgame 20/3', () => {
    const p = buildMatrix(funnelPreset)
    const idx = funnelPreset.states.findIndex((s) => s.id === 'churned')
    const r = absorptionAnalysis(p, [idx])
    const at = (id: string) => funnelPreset.states.findIndex((s) => s.id === id)
    expect(r.expectedSteps[at('tutorial')]).toBeCloseTo(6, 10)
    expect(r.expectedSteps[at('leveling')]).toBeCloseTo(20 / 3, 10)
    expect(r.expectedSteps[at('endgame')]).toBeCloseTo(20 / 3, 10)
  })
})

describe('win-back preset (adds Returning, no absorbing states)', () => {
  it('is valid, has no absorbing states, one closed class', () => {
    expect(validateChain(winBackPreset).valid).toBe(true)
    expect(absorbingStateIds(winBackPreset)).toEqual([])
    expect(closedClasses(winBackPreset)).toHaveLength(1)
  })
  it('steady state: [0, 21/128, 35/128, 60/128, 12/128] in T/L/E/C/R order', () => {
    const r = steadyState(buildMatrix(winBackPreset))
    expect(r.converged).toBe(true)
    const expected = [0, 21 / 128, 35 / 128, 60 / 128, 12 / 128]
    r.distribution.forEach((x, i) => expect(x).toBeCloseTo(expected[i], 6))
  })
})
