import { describe, expect, it } from 'vitest'
import { buildScenarioChain, comparisonFamily, getScenario, scenarios } from './scenarios'
import { presets } from './presets'
import { validateChain } from './chain'
import { buildMatrix } from './chain'
import { expectedTenure, longRunDistribution } from './analysis'
import { loadSections } from './essayContent'
import { parseCompare } from './compare'

describe('scenarios are structurally sound', () => {
  it('have unique ids and real presets', () => {
    expect(new Set(scenarios.map((s) => s.id)).size).toBe(scenarios.length)
    const presetIds = new Set(presets.map((p) => p.id))
    for (const s of scenarios) expect(presetIds, s.id).toContain(s.presetId)
  })

  it('every scenario builds a valid chain with resolvable endpoints', () => {
    for (const s of scenarios) {
      const chain = buildScenarioChain(s)
      expect(validateChain(chain).valid, s.id).toBe(true)
      const stateIds = new Set(chain.states.map((st) => st.id))
      expect(stateIds, s.id).toContain(chain.inputStateId)
      expect(stateIds, s.id).toContain(chain.outputStateId)
      expect(new Set(chain.transitions.map((t) => t.id)).size, s.id).toBe(
        chain.transitions.length,
      )
    }
  })

  it('row edits and counts only reference states that exist', () => {
    for (const s of scenarios) {
      const stateIds = new Set(
        presets.find((p) => p.id === s.presetId)!.states.map((st) => st.id),
      )
      for (const [from, row] of Object.entries(s.rows ?? {})) {
        expect(stateIds, `${s.id}: row from`).toContain(from)
        for (const to of Object.keys(row)) expect(stateIds, `${s.id}: row to`).toContain(to)
      }
      for (const id of Object.keys(s.counts ?? {})) {
        expect(stateIds, `${s.id}: counts`).toContain(id)
      }
    }
  })

  // Chips read as self-contained examples, so clicking one after another
  // must not inherit the previous cohort. useSimulation clears counts for a
  // scenario that declares none; this pins the other half of that contract --
  // a scenario that *does* declare counts must name every state it wants
  // populated, since unlisted ones are explicitly zeroed rather than left to
  // the 100-player default.
  it('scenarios with a cohort put players somewhere', () => {
    for (const s of scenarios) {
      if (!s.counts) continue
      const total = Object.values(s.counts).reduce((a, b) => a + b, 0)
      expect(total, `${s.id}: empty cohort`).toBeGreaterThan(0)
      const chain = buildScenarioChain(s)
      // The cohort must include the state tenure is measured from, or the
      // simulation and the expected-tenure line would describe different runs.
      expect(s.counts[chain.inputStateId!] ?? 0, `${s.id}: none in input state`)
        .toBeGreaterThan(0)
    }
  })

  it('sibling scenarios share a comparison family, strangers do not', () => {
    for (const s of scenarios) expect(comparisonFamily(s.id), s.id).toBe(s.presetId)
    // Two scenarios pointed at different presets must never collide.
    const families = new Map(scenarios.map((s) => [s.presetId, s.id]))
    for (const [presetId, sampleId] of families) {
      for (const other of scenarios) {
        if (other.presetId === presetId) continue
        expect(comparisonFamily(sampleId)).not.toBe(comparisonFamily(other.id))
      }
    }
  })

  it('a non-scenario id is its own family (presets, "custom")', () => {
    for (const p of presets) expect(comparisonFamily(p.id)).toBe(p.id)
    expect(comparisonFamily('custom')).toBe('custom')
  })

  it('focus anchors are declared by a component', () => {
    const sources = Object.values(
      import.meta.glob('../components/**/*.tsx', {
        eager: true,
        query: '?raw',
        import: 'default',
      }) as Record<string, string>,
    )
    const anchors = new Set(
      sources.flatMap((src) =>
        [...src.matchAll(/data-tool-anchor="([^"]+)"/g)].map((m) => m[1]),
      ),
    )
    for (const s of scenarios) expect(anchors, s.id).toContain(s.focusAnchor)
  })
})

describe('scenario numbers match the essay', () => {
  const tenure = (id: string) => expectedTenure(buildScenarioChain(getScenario(id)!))!
  const churnedForever = (id: string) => {
    const chain = buildScenarioChain(getScenario(id)!)
    const start = chain.states.map((s) => (s.id === chain.inputStateId ? 1 : 0))
    const idx = chain.states.findIndex((s) => s.id === 'churned')
    return longRunDistribution(buildMatrix(chain), start).distribution[idx] * 100
  }

  it('Q1: rival onboarding fixes, one dud and one real lever', () => {
    expect(tenure('q1-baseline')).toBeCloseTo(6, 10)
    expect(tenure('q1-faster')).toBeCloseTo(55 / 9, 10)
    expect(tenure('q1-gentler')).toBeCloseTo(22 / 3, 10)
  })

  it('Q2: veterans outlast a brand-new cohort', () => {
    expect(tenure('q2-fresh')).toBeCloseTo(6, 10)
    expect(tenure('q2-veterans')).toBeCloseTo(20 / 3, 10)
  })

  it('Q3: option A changes nothing, option B moves ten points', () => {
    expect(churnedForever('q3-baseline')).toBeCloseTo(46.875, 3)
    expect(churnedForever('q3-optionA')).toBeCloseTo(46.875, 3)
    expect(churnedForever('q3-optionB')).toBeCloseTo(37.037, 3)
  })

  it('Q4: tenure climbs the spending ladder', () => {
    expect(tenure('q4-free')).toBeCloseTo(7.34, 2)
    expect(tenure('q4-payer')).toBeCloseTo(8.02, 2)
    expect(tenure('q4-whale')).toBeCloseTo(12.01, 2)
  })
})

describe('the compare graphics quote the computed numbers', () => {
  // The fences in sample-questions.md carry the same figures the scenarios
  // produce. This walks every fence row and checks its value against the
  // actual math, so a retuned preset or edited fence can't silently drift
  // the prose away from what the tool will show.
  const section = loadSections().find((s) => s.id === 'sample-questions')!
  const fences = [...section.body.matchAll(/```compare\n([\s\S]*?)```/g)].map((m) =>
    parseCompare(m[1]),
  )
  const tenure = (id: string) => expectedTenure(buildScenarioChain(getScenario(id)!))!
  const churnedForever = (id: string) => {
    const chain = buildScenarioChain(getScenario(id)!)
    const start = chain.states.map((s) => (s.id === chain.inputStateId ? 1 : 0))
    const idx = chain.states.findIndex((s) => s.id === 'churned')
    return longRunDistribution(buildMatrix(chain), start).distribution[idx] * 100
  }

  const expected: Array<Array<[string, number]>> = [
    [
      ['Baseline', tenure('q1-baseline')],
      ['Speed up graduation', tenure('q1-faster')],
      ['Cut early churn', tenure('q1-gentler')],
    ],
    [
      ['Brand-new cohort', tenure('q2-fresh')],
      ['Veteran cohort', tenure('q2-veterans')],
    ],
    [
      ['Baseline, stuck in Churned', churnedForever('q3-baseline')],
      ['Option A, faster onboarding', churnedForever('q3-optionA')],
      ['Option B, stronger win-back', churnedForever('q3-optionB')],
    ],
    [
      ['Free player', tenure('q4-free')],
      ['Payer', tenure('q4-payer')],
      ['Whale', tenure('q4-whale')],
    ],
  ]

  it('has one fence per question', () => {
    expect(fences).toHaveLength(expected.length)
  })

  expected.forEach((rows, i) => {
    it(`fence ${i + 1} rows match the math to one decimal`, () => {
      const fence = fences[i]
      expect(fence.rows.map((r) => r.label)).toEqual(rows.map(([label]) => label))
      for (const [label, value] of rows) {
        const row = fence.rows.find((r) => r.label === label)!
        expect(row.value, `${label}`).toBeCloseTo(value, 1)
      }
    })
  })
})
