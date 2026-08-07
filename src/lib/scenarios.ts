import type { Chain } from './types'
import { presets } from './presets'

/**
 * A scenario is a clickable before/after example: a preset plus the one edit
 * the essay is talking about, so the reader can load each side of a
 * comparison into the live tool and watch the numbers move instead of taking
 * the prose's word for it.
 *
 * The prose side is the `#scenario:<id>` markdown link scheme (rendered as a
 * chip by EssayLink); the tool side is the `watershed:load-scenario` event in
 * toolBridge.ts, which three components subscribe to for the parts they own:
 * the canvas loads the chain, the simulation applies starting counts, and the
 * forecast panel jumps its slider to the infinity notch when asked.
 */
export interface Scenario {
  id: string
  /** Becomes the loaded chain's display name. */
  name: string
  presetId: string
  /**
   * Full-row replacements, keyed by from-state: each entry is that state's
   * complete outgoing row (to-state -> probability, omitted means 0). Rows
   * must still sum to 1 -- the tests check every one.
   */
  rows?: Record<string, Record<string, number>>
  /** Override the chain's input state (where tenure is measured from). */
  inputStateId?: string
  /**
   * Starting populations by state id. When present, every state in the
   * chain is set: listed ones to their value, unlisted ones to 0 -- leaving
   * them to the simulation's own defaults would quietly re-seed 100 players
   * into the first state.
   */
  counts?: Record<string, number>
  /** Panel the reader should be looking at after clicking. */
  focusAnchor: string
  /** Jump the forecast slider to its infinity notch. */
  forecastToForever?: boolean
}

export const scenarios: Scenario[] = [
  // Q1: is onboarding actually the problem? Two rival fixes to the same
  // Tutorial row; expected tenure exposes which lever matters.
  {
    id: 'q1-baseline',
    name: 'Player funnel · baseline',
    presetId: 'preset-funnel',
    focusAnchor: 'retention',
  },
  {
    id: 'q1-faster',
    name: 'Player funnel · faster graduation',
    presetId: 'preset-funnel',
    rows: { tutorial: { tutorial: 0.4, leveling: 0.4, churned: 0.2 } },
    focusAnchor: 'retention',
  },
  {
    id: 'q1-gentler',
    name: 'Player funnel · gentler on-ramp',
    presetId: 'preset-funnel',
    rows: { tutorial: { tutorial: 0.5, leveling: 0.4, churned: 0.1 } },
    focusAnchor: 'retention',
  },

  // Q2: when do players leave? Same chain, different starting cohort.
  {
    id: 'q2-fresh',
    name: 'Player funnel · brand-new cohort',
    presetId: 'preset-funnel',
    counts: { tutorial: 100 },
    focusAnchor: 'simulate',
  },
  {
    id: 'q2-veterans',
    name: 'Player funnel · veteran cohort',
    presetId: 'preset-funnel',
    inputStateId: 'leveling',
    counts: { leveling: 50, endgame: 50 },
    focusAnchor: 'simulate',
  },

  // Q3: budget for one fix. Baseline win-back loop against the two options
  // from the essay, judged at the forecast's infinity notch.
  {
    id: 'q3-baseline',
    name: 'Win-back loop · baseline',
    presetId: 'preset-winback',
    focusAnchor: 'forecast',
    forecastToForever: true,
  },
  {
    id: 'q3-optionA',
    name: 'Win-back loop · faster onboarding',
    presetId: 'preset-winback',
    rows: { tutorial: { tutorial: 0.4, leveling: 0.4, churned: 0.2 } },
    focusAnchor: 'forecast',
    forecastToForever: true,
  },
  {
    id: 'q3-optionB',
    name: 'Win-back loop · stronger win-back',
    presetId: 'preset-winback',
    rows: { churned: { churned: 0.7, returning: 0.3 } },
    focusAnchor: 'forecast',
    forecastToForever: true,
  },

  // Q4: does spend mirror retention? Same funnel, tenure measured from each
  // rung of the spending ladder.
  {
    id: 'q4-free',
    name: 'Free-to-paid · start as Free',
    presetId: 'preset-monetization',
    inputStateId: 'free',
    counts: { free: 100 },
    focusAnchor: 'retention',
  },
  {
    id: 'q4-payer',
    name: 'Free-to-paid · start as Payer',
    presetId: 'preset-monetization',
    inputStateId: 'payer',
    counts: { payer: 100 },
    focusAnchor: 'retention',
  },
  {
    id: 'q4-whale',
    name: 'Free-to-paid · start as Whale',
    presetId: 'preset-monetization',
    inputStateId: 'whale',
    counts: { whale: 100 },
    focusAnchor: 'retention',
  },
]

export function getScenario(id: string): Scenario | undefined {
  return scenarios.find((s) => s.id === id)
}

/**
 * A chain's identity for before/after comparison purposes. A scenario's own
 * id is unique per chip (`q1-faster`, `q1-gentler`, ...), so two chips from
 * the same family would otherwise look like a totally different chain to
 * anything keying off `chain.id` directly. Grouping by the underlying preset
 * id instead lets a family of examples be treated as "the same chain, edited"
 * -- which is exactly what they are -- while a genuinely different chain
 * (another preset, or "Build your own") still resolves to its own id.
 */
export function comparisonFamily(chainId: string): string {
  return getScenario(chainId)?.presetId ?? chainId
}

/** The scenario's chain: its preset with the row edits applied. */
export function buildScenarioChain(scenario: Scenario): Chain {
  const preset = presets.find((p) => p.id === scenario.presetId)
  if (!preset) throw new Error(`scenario ${scenario.id}: unknown preset ${scenario.presetId}`)
  const chain = structuredClone(preset)
  for (const [from, row] of Object.entries(scenario.rows ?? {})) {
    chain.transitions = chain.transitions.filter((t) => t.from !== from)
    for (const [to, probability] of Object.entries(row)) {
      if (probability > 0) {
        chain.transitions.push({ id: `${from}>${to}`, from, to, probability })
      }
    }
  }
  return {
    ...chain,
    id: scenario.id,
    name: scenario.name,
    inputStateId: scenario.inputStateId ?? chain.inputStateId,
  }
}
