import { describe, it, expect } from 'vitest'
import { chainReducer } from './chainReducer'
import { funnelPreset } from '../lib/presets'

const empty = { id: 'c', name: 'My chain', states: [], transitions: [] }

describe('chainReducer', () => {
  it('addState creates an auto-named state at the given position', () => {
    const c = chainReducer(empty, { type: 'addState', position: { x: 10, y: 20 } })
    expect(c.states).toHaveLength(1)
    expect(c.states[0].name).toBe('State 1')
    expect(c.states[0].position).toEqual({ x: 10, y: 20 })
  })
  it('addTransition defaults probability to the remaining row mass', () => {
    let c = chainReducer(empty, { type: 'addState', position: { x: 0, y: 0 } })
    c = chainReducer(c, { type: 'addState', position: { x: 100, y: 0 } })
    const [a, b] = c.states
    c = chainReducer(c, { type: 'addTransition', from: a.id, to: a.id }) // self-loop → 1
    expect(c.transitions[0].probability, 'first gets full mass').toBe(1)
    c = chainReducer(c, { type: 'setProbability', id: c.transitions[0].id, probability: 0.6 })
    c = chainReducer(c, { type: 'addTransition', from: a.id, to: b.id }) // remainder → 0.4
    expect(c.transitions[1].probability).toBeCloseTo(0.4, 12)
  })
  it('addTransition is a no-op when the pair already exists', () => {
    let c = funnelPreset
    const before = c.transitions.length
    c = chainReducer(c, { type: 'addTransition', from: 'tutorial', to: 'leveling' })
    expect(c.transitions).toHaveLength(before)
  })
  it('deleteState removes the state and all transitions touching it', () => {
    const c = chainReducer(funnelPreset, { type: 'deleteState', id: 'leveling' })
    expect(c.states.map((s) => s.id)).not.toContain('leveling')
    expect(c.transitions.every((t) => t.from !== 'leveling' && t.to !== 'leveling')).toBe(true)
  })
  it('setProbability clamps to [0, 1]', () => {
    const c = chainReducer(funnelPreset, { type: 'setProbability', id: 't-l', probability: 1.5 })
    expect(c.transitions.find((t) => t.id === 't-l')!.probability).toBe(1)
  })
  it('renameState, moveState, deleteTransition, loadChain behave as expected', () => {
    let c = chainReducer(funnelPreset, { type: 'renameState', id: 'tutorial', name: 'Onboarding' })
    expect(c.states.find((s) => s.id === 'tutorial')!.name).toBe('Onboarding')
    c = chainReducer(c, { type: 'moveState', id: 'tutorial', position: { x: 5, y: 5 } })
    expect(c.states.find((s) => s.id === 'tutorial')!.position).toEqual({ x: 5, y: 5 })
    c = chainReducer(c, { type: 'deleteTransition', id: 't-l' })
    expect(c.transitions.find((t) => t.id === 't-l')).toBeUndefined()
    c = chainReducer(c, { type: 'loadChain', chain: funnelPreset })
    expect(c).toEqual(funnelPreset)
  })
})
