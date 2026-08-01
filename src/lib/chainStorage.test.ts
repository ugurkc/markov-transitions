import { describe, it, expect } from 'vitest'
import { normalizeChain } from './chainStorage'
import { funnelPreset, presets } from './presets'
import type { Chain } from './types'

/** The funnel preset exactly as it was persisted before endpoints existed. */
function legacyFunnel(): unknown {
  const { inputStateId: _i, outputStateId: _o, ...rest } = funnelPreset
  return structuredClone(rest)
}

describe('normalizeChain — rejecting unusable data', () => {
  it('rejects values that are not objects', () => {
    expect(normalizeChain(null, presets)).toBeNull()
    expect(normalizeChain(undefined, presets)).toBeNull()
    expect(normalizeChain('a string', presets)).toBeNull()
    expect(normalizeChain(42, presets)).toBeNull()
  })
  it('rejects an object with no states/transitions arrays', () => {
    // Exactly the shape that used to blank the whole page.
    expect(normalizeChain({ id: 'custom', name: 'Broken' }, presets)).toBeNull()
  })
  it('rejects when states or transitions is the wrong type', () => {
    expect(normalizeChain({ id: 'c', name: 'n', states: {}, transitions: [] }, presets)).toBeNull()
    expect(normalizeChain({ id: 'c', name: 'n', states: [], transitions: 'x' }, presets)).toBeNull()
  })
  it('accepts a legitimately empty chain', () => {
    const c = normalizeChain({ id: 'custom', name: 'Mine', states: [], transitions: [] }, presets)
    expect(c).not.toBeNull()
    expect(c!.states).toEqual([])
  })
})

describe('normalizeChain — preserving good data', () => {
  it('round-trips a valid current chain unchanged', () => {
    const c = normalizeChain(structuredClone(funnelPreset), presets)
    expect(c).toEqual(funnelPreset)
  })
})

describe('normalizeChain — migrating chains saved before endpoints existed', () => {
  it('adopts the matching preset endpoints for a stored preset', () => {
    const c = normalizeChain(legacyFunnel(), presets)
    expect(c!.inputStateId).toBe('tutorial')
    expect(c!.outputStateId).toBe('churned')
  })
  it('leaves endpoints unset for a stored custom chain, which has no preset to copy', () => {
    const legacyCustom = {
      id: 'custom',
      name: 'Mine',
      states: [{ id: 'a', name: 'A', position: { x: 0, y: 0 } }],
      transitions: [{ id: 't', from: 'a', to: 'a', probability: 1 }],
    }
    const c = normalizeChain(legacyCustom, presets)
    expect(c!.inputStateId).toBeNull()
    expect(c!.outputStateId).toBeNull()
  })
})

describe('normalizeChain — repairing dangling references', () => {
  it('clears endpoint ids that no longer match a state', () => {
    const dangling: Chain = {
      ...structuredClone(funnelPreset),
      id: 'custom',
      inputStateId: 'tutorial',
      outputStateId: 'DELETED',
    }
    const c = normalizeChain(dangling, presets)
    expect(c!.inputStateId).toBe('tutorial')
    expect(c!.outputStateId).toBeNull()
  })
  it('drops transitions that point at states which no longer exist', () => {
    const c = normalizeChain(
      {
        id: 'custom',
        name: 'Mine',
        states: [{ id: 'a', name: 'A', position: { x: 0, y: 0 } }],
        transitions: [
          { id: 't1', from: 'a', to: 'a', probability: 1 },
          { id: 't2', from: 'a', to: 'ghost', probability: 0.5 },
        ],
      },
      presets,
    )
    expect(c!.transitions.map((t) => t.id)).toEqual(['t1'])
  })
  it('drops malformed states and any transitions that referenced them', () => {
    const c = normalizeChain(
      {
        id: 'custom',
        name: 'Mine',
        states: [
          { id: 'a', name: 'A', position: { x: 0, y: 0 } },
          { id: 'b', name: 'B' }, // no position
        ],
        transitions: [
          { id: 't1', from: 'a', to: 'a', probability: 1 },
          { id: 't2', from: 'a', to: 'b', probability: 0.5 },
        ],
      },
      presets,
    )
    expect(c!.states.map((s) => s.id)).toEqual(['a'])
    expect(c!.transitions.map((t) => t.id)).toEqual(['t1'])
  })
  it('drops transitions whose probability is not a finite number', () => {
    const c = normalizeChain(
      {
        id: 'custom',
        name: 'Mine',
        states: [{ id: 'a', name: 'A', position: { x: 0, y: 0 } }],
        transitions: [
          { id: 't1', from: 'a', to: 'a', probability: 0.5 },
          { id: 't2', from: 'a', to: 'a', probability: 'nope' },
        ],
      },
      presets,
    )
    expect(c!.transitions.map((t) => t.id)).toEqual(['t1'])
  })
})
