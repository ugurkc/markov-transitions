import { describe, it, expect } from 'vitest'
import {
  funnelPreset,
  monetizationPreset,
  presets,
  rankedPreset,
  winBackPreset,
} from './presets'
import { validateChain, absorbingStateIds, closedClasses, buildMatrix } from './chain'
import { absorptionAnalysis, steadyState } from './analysis'
import type { Chain } from './types'

/** Expected steps to absorption, keyed by state id. */
function stepsToAbsorption(chain: typeof funnelPreset, absorbingId: string) {
  const p = buildMatrix(chain)
  const idx = chain.states.findIndex((s) => s.id === absorbingId)
  const { expectedSteps } = absorptionAnalysis(p, [idx])
  return (id: string) => expectedSteps[chain.states.findIndex((s) => s.id === id)]
}

/** A copy of `chain` with `from`'s outgoing row replaced (must still sum to 1). */
function withRow(chain: Chain, from: string, row: Record<string, number>): Chain {
  return {
    ...chain,
    transitions: chain.transitions.map((t) =>
      t.from === from && row[t.to] !== undefined ? { ...t, probability: row[t.to] } : t,
    ),
  }
}

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

  // Pins the two-options worked example in steady-state.md's prose: a
  // faster-onboarding fix that provably changes nothing, versus a win-back
  // fix that moves Churned by ~10 points. If the preset's tuning ever
  // changes, this is what tells you the essay's numbers went stale with it.
  describe('worked example: two options, one sprint', () => {
    const churnedPct = (chain: Chain) => {
      const idx = chain.states.findIndex((s) => s.id === 'churned')
      return steadyState(buildMatrix(chain)).distribution[idx] * 100
    }
    const baselineChurnedPct = churnedPct(winBackPreset)

    it('option A (faster onboarding: Tutorial 40/40/20) leaves steady-state Churned unchanged', () => {
      const optionA = withRow(winBackPreset, 'tutorial', {
        tutorial: 0.4,
        leveling: 0.4,
        churned: 0.2,
      })
      expect(churnedPct(optionA)).toBeCloseTo(baselineChurnedPct, 2)
    })

    it('option B (more win-back: Churned 70/30) drops steady-state Churned by about 10 points', () => {
      const optionB = withRow(winBackPreset, 'churned', { churned: 0.7, returning: 0.3 })
      expect(baselineChurnedPct - churnedPct(optionB)).toBeCloseTo(9.8, 1)
      expect(churnedPct(optionB)).toBeCloseTo(37.0, 1)
    })
  })
})

describe('ranked ladder preset (Bronze→Platinum, Inactive absorbing)', () => {
  it('is valid and has exactly Inactive absorbing', () => {
    expect(validateChain(rankedPreset).valid).toBe(true)
    expect(absorbingStateIds(rankedPreset)).toEqual(['inactive'])
  })

  // The design intent of the tuning: every rung up the ladder is stickier
  // than the one below it, so a player's expected lifetime grows with rank.
  it('expected weeks before going inactive rise monotonically with rank', () => {
    const steps = stepsToAbsorption(rankedPreset, 'inactive')
    expect(steps('bronze')).toBeLessThan(steps('silver'))
    expect(steps('silver')).toBeLessThan(steps('gold'))
    expect(steps('gold')).toBeLessThan(steps('platinum'))
  })

  // Pins the diminishing-returns figures the essay's prose quotes
  // (try-it.md: "about 1.7 extra weeks", "0.6 weeks", "barely 0.2") — each
  // rung buys less than the one before it, not just "more than before".
  it('each rung up buys a shrinking amount of extra expected tenure', () => {
    const steps = stepsToAbsorption(rankedPreset, 'inactive')
    const bronzeToSilver = steps('silver') - steps('bronze')
    const silverToGold = steps('gold') - steps('silver')
    const goldToPlatinum = steps('platinum') - steps('gold')
    expect(bronzeToSilver).toBeCloseTo(1.7, 1)
    expect(silverToGold).toBeCloseTo(0.6, 1)
    expect(goldToPlatinum).toBeCloseTo(0.2, 1)
    expect(bronzeToSilver).toBeGreaterThan(silverToGold)
    expect(silverToGold).toBeGreaterThan(goldToPlatinum)
  })
})

describe('free-to-paid preset (Free/Payer/Whale, Lapsed absorbing)', () => {
  it('is valid and has exactly Lapsed absorbing', () => {
    expect(validateChain(monetizationPreset).valid).toBe(true)
    expect(absorbingStateIds(monetizationPreset)).toEqual(['lapsed'])
  })

  it('whales outlast payers, who outlast free players', () => {
    const steps = stepsToAbsorption(monetizationPreset, 'lapsed')
    expect(steps('free')).toBeLessThan(steps('payer'))
    expect(steps('payer')).toBeLessThan(steps('whale'))
  })
})

describe('all presets', () => {
  it('are valid chains with unique ids and both endpoints resolvable', () => {
    expect(new Set(presets.map((p) => p.id)).size).toBe(presets.length)
    for (const p of presets) {
      expect(validateChain(p).valid, p.id).toBe(true)
      const ids = p.states.map((s) => s.id)
      expect(ids, p.id).toContain(p.inputStateId)
      expect(ids, p.id).toContain(p.outputStateId)
    }
  })

  it('have unique state ids and unique transition ids within each chain', () => {
    for (const p of presets) {
      expect(new Set(p.states.map((s) => s.id)).size, p.id).toBe(p.states.length)
      expect(new Set(p.transitions.map((t) => t.id)).size, p.id).toBe(p.transitions.length)
    }
  })
})
