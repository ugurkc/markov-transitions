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
  it('addState never reuses a name that is already taken', () => {
    // Deleting a middle state used to leave the counter pointing at a name
    // that still existed, producing two states called "State 2".
    const withGap = {
      ...empty,
      states: [
        { id: 'x', name: 'State 2', position: { x: 0, y: 0 } },
      ],
    }
    const c = chainReducer(withGap, { type: 'addState', position: { x: 500, y: 500 } })
    const names = c.states.map((s) => s.name)
    expect(new Set(names).size).toBe(names.length)
    expect(names).toContain('State 1')
  })
  it('addState fills the lowest free slot rather than counting length', () => {
    const withGap = {
      ...empty,
      states: [
        { id: 'a', name: 'State 1', position: { x: 0, y: 0 } },
        { id: 'b', name: 'State 3', position: { x: 10, y: 10 } },
      ],
    }
    const c = chainReducer(withGap, { type: 'addState', position: { x: 500, y: 500 } })
    expect(c.states[2].name).toBe('State 2')
  })
  it('addState offsets a new state rather than stacking it exactly on another', () => {
    // "+ Add state" always passes the canvas centre, so repeated clicks used
    // to pile invisible states on the same pixel.
    let c = chainReducer(empty, { type: 'addState', position: { x: 100, y: 100 } })
    c = chainReducer(c, { type: 'addState', position: { x: 100, y: 100 } })
    c = chainReducer(c, { type: 'addState', position: { x: 100, y: 100 } })
    const seen = new Set(c.states.map((s) => `${s.position.x},${s.position.y}`))
    expect(seen.size).toBe(3)
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
  it('deleteState clears inputStateId/outputStateId when they point at the deleted state', () => {
    const withEndpoints = { ...funnelPreset, inputStateId: 'tutorial', outputStateId: 'churned' }
    const c = chainReducer(withEndpoints, { type: 'deleteState', id: 'tutorial' })
    expect(c.inputStateId).toBeNull()
    expect(c.outputStateId).toBe('churned')
    const c2 = chainReducer(withEndpoints, { type: 'deleteState', id: 'churned' })
    expect(c2.inputStateId).toBe('tutorial')
    expect(c2.outputStateId).toBeNull()
  })
  it('deleteState leaves inputStateId/outputStateId alone for an unrelated state', () => {
    const withEndpoints = { ...funnelPreset, inputStateId: 'tutorial', outputStateId: 'churned' }
    const c = chainReducer(withEndpoints, { type: 'deleteState', id: 'leveling' })
    expect(c.inputStateId).toBe('tutorial')
    expect(c.outputStateId).toBe('churned')
  })
  it('setInputState and setOutputState assign the endpoint and flip the chain to custom', () => {
    let c = chainReducer(funnelPreset, { type: 'setInputState', id: 'tutorial' })
    expect(c.inputStateId).toBe('tutorial')
    expect(c.id).toBe('custom')
    c = chainReducer(c, { type: 'setOutputState', id: 'churned' })
    expect(c.outputStateId).toBe('churned')
    expect(c.id).toBe('custom')
  })
  it('setInputState and setOutputState accept null to clear the endpoint', () => {
    const withEndpoints = { ...funnelPreset, inputStateId: 'tutorial', outputStateId: 'churned' }
    const c = chainReducer(withEndpoints, { type: 'setInputState', id: null })
    expect(c.inputStateId).toBeNull()
    expect(c.outputStateId).toBe('churned')
  })
  it('setProbability clamps to [0, 1]', () => {
    const c = chainReducer(funnelPreset, { type: 'setProbability', id: 't-l', probability: 1.5 })
    expect(c.transitions.find((t) => t.id === 't-l')!.probability).toBe(1)
  })
  it('setCell creates a transition with the given probability in an empty cell', () => {
    const c = chainReducer(funnelPreset, { type: 'setCell', from: 'churned', to: 'tutorial', probability: 0.2 })
    const t = c.transitions.find((t) => t.from === 'churned' && t.to === 'tutorial')
    expect(t).toBeDefined()
    expect(t!.probability).toBe(0.2)
  })
  it('setCell updates an existing transition, clamping to [0, 1]', () => {
    const c = chainReducer(funnelPreset, { type: 'setCell', from: 'tutorial', to: 'leveling', probability: 1.5 })
    expect(c.transitions.find((t) => t.id === 't-l')!.probability).toBe(1)
  })
  it('setCell with 0 deletes an existing transition', () => {
    const c = chainReducer(funnelPreset, { type: 'setCell', from: 'tutorial', to: 'leveling', probability: 0 })
    expect(c.transitions.find((t) => t.from === 'tutorial' && t.to === 'leveling')).toBeUndefined()
  })
  it('setCell with 0 on an absent pair is a no-op', () => {
    const c = chainReducer(funnelPreset, { type: 'setCell', from: 'churned', to: 'tutorial', probability: 0 })
    expect(c).toBe(funnelPreset)
  })
  it('content edits flip the chain id to custom; moveState and loadChain keep it', () => {
    let c = chainReducer(funnelPreset, { type: 'setProbability', id: 't-l', probability: 0.4 })
    expect(c.id).toBe('custom')
    c = chainReducer(funnelPreset, { type: 'moveState', id: 'tutorial', position: { x: 1, y: 1 } })
    expect(c.id).toBe(funnelPreset.id)
    c = chainReducer(c, { type: 'loadChain', chain: funnelPreset })
    expect(c.id).toBe(funnelPreset.id)
    c = chainReducer(c, { type: 'addState', position: { x: 0, y: 0 } })
    expect(c.id).toBe('custom')
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
