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
  | { type: 'loadChain'; chain: Chain }

export function chainReducer(chain: Chain, action: ChainAction): Chain {
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
          probability: Math.max(0, Math.min(1, 1 - rowSum)),
        }],
      }
    }
    case 'setProbability':
      return {
        ...chain,
        transitions: chain.transitions.map((t) =>
          t.id === action.id ? { ...t, probability: Math.max(0, Math.min(1, action.probability)) } : t),
      }
    case 'deleteTransition':
      return { ...chain, transitions: chain.transitions.filter((t) => t.id !== action.id) }
    case 'loadChain':
      return action.chain
  }
}
