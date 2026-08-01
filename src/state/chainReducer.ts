import type { Chain } from '../lib/types'
import { validateChain } from '../lib/chain'

export type ChainAction =
  | { type: 'addState'; position: { x: number; y: number } }
  | { type: 'renameState'; id: string; name: string }
  | { type: 'moveState'; id: string; position: { x: number; y: number } }
  | { type: 'deleteState'; id: string }
  | { type: 'addTransition'; from: string; to: string }
  | { type: 'setProbability'; id: string; probability: number }
  | { type: 'deleteTransition'; id: string }
  | { type: 'setCell'; from: string; to: string; probability: number }
  | { type: 'loadChain'; chain: Chain }

const clamp01 = (p: number) => Math.max(0, Math.min(1, p))

export function chainReducer(chain: Chain, action: ChainAction): Chain {
  const next = reduce(chain, action)
  // Any content edit turns the chain into a custom one, so the preset picker
  // knows a preset is no longer active. Moving states is layout, not content;
  // loadChain sets its own id.
  if (
    next !== chain &&
    action.type !== 'moveState' &&
    action.type !== 'loadChain'
  ) {
    return { ...next, id: 'custom' }
  }
  return next
}

function reduce(chain: Chain, action: ChainAction): Chain {
  switch (action.type) {
    case 'addState': {
      const n = chain.states.length + 1
      return {
        ...chain,
        states: [...chain.states, {
          id: crypto.randomUUID(),
          name: `State ${n}`,
          position: action.position,
        }],
      }
    }
    case 'renameState':
      return { ...chain, states: chain.states.map((s) => s.id === action.id ? { ...s, name: action.name } : s) }
    case 'moveState':
      return { ...chain, states: chain.states.map((s) => s.id === action.id ? { ...s, position: action.position } : s) }
    case 'deleteState':
      return {
        ...chain,
        states: chain.states.filter((s) => s.id !== action.id),
        transitions: chain.transitions.filter((t) => t.from !== action.id && t.to !== action.id),
      }
    case 'addTransition': {
      if (chain.transitions.some((t) => t.from === action.from && t.to === action.to)) return chain
      const rowSum = validateChain(chain).rowSums[action.from] ?? 0
      return {
        ...chain,
        transitions: [...chain.transitions, {
          id: crypto.randomUUID(),
          from: action.from,
          to: action.to,
          probability: clamp01(1 - rowSum),
        }],
      }
    }
    case 'setProbability':
      return {
        ...chain,
        transitions: chain.transitions.map((t) =>
          t.id === action.id ? { ...t, probability: clamp01(action.probability) } : t),
      }
    case 'deleteTransition':
      return { ...chain, transitions: chain.transitions.filter((t) => t.id !== action.id) }
    case 'setCell': {
      const existing = chain.transitions.find(
        (t) => t.from === action.from && t.to === action.to,
      )
      const p = clamp01(action.probability)
      if (!existing) {
        if (p === 0) return chain
        return {
          ...chain,
          transitions: [...chain.transitions, {
            id: crypto.randomUUID(),
            from: action.from,
            to: action.to,
            probability: p,
          }],
        }
      }
      if (p === 0) {
        return { ...chain, transitions: chain.transitions.filter((t) => t.id !== existing.id) }
      }
      return {
        ...chain,
        transitions: chain.transitions.map((t) =>
          t.id === existing.id ? { ...t, probability: p } : t),
      }
    }
    case 'loadChain':
      return action.chain
  }
}
