import { describe, expect, it } from 'vitest'
import { presets } from './presets'

/**
 * Panel explanatory copy is generic UI — it renders for every chain, including
 * the ones a reader builds themselves. Naming a specific state in it leaks
 * whichever preset happened to be loaded when the copy was written.
 *
 * This caught a real bug: the steady-state note asserted "an absorbing state
 * like Churned", which is wrong in the win-back preset (Churned isn't
 * absorbing there) and meaningless in the ranked-ladder and free-to-paid
 * presets, which have no state called Churned at all. Derive names from the
 * live chain instead — MatrixPanel's "For example:" sentence is the pattern.
 */
describe('panel copy is chain-agnostic', () => {
  const sources = import.meta.glob('../components/**/*.tsx', {
    eager: true,
    query: '?raw',
    import: 'default',
  }) as Record<string, string>

  // Every state name across every preset, deduped.
  const presetStateNames = [
    ...new Set(presets.flatMap((p) => p.states.map((s) => s.name))),
  ]

  it('has preset state names to check against', () => {
    expect(presetStateNames.length).toBeGreaterThan(5)
  })

  for (const [path, src] of Object.entries(sources)) {
    it(`${path.split('/').pop()} hardcodes no preset state name`, () => {
      // Only rendered text counts. Strip comments (explanation, not copy) and
      // JSX expressions ({...}), whose values are derived from the live chain.
      const literalText = src
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '')
        .replace(/\{[^{}]*\}/g, '')
      const offenders = presetStateNames.filter((name) =>
        new RegExp(`\\b${name}\\b`).test(literalText),
      )
      expect(offenders, `hardcoded in ${path}`).toEqual([])
    })
  }
})
