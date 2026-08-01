import type { Chain, StateNode } from '../lib/types'
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
  | { type: 'setInputState'; id: string | null }
  | { type: 'setOutputState'; id: string | null }
  | { type: 'loadChain'; chain: Chain }

const clamp01 = (p: number) => Math.max(0, Math.min(1, p))

/** Diagonal nudge applied when a new state would land exactly on another. */
const STACK_OFFSET = 28

/**
 * Lowest unused "State N". Naming from `states.length + 1` reused a name that
 * was still taken whenever a middle state had been deleted, leaving two rows
 * in the matrix — and two options in the endpoint pickers — with identical
 * labels and no way to tell them apart.
 */
function nextStateName(states: StateNode[]): string {
  const taken = new Set(states.map((s) => s.name))
  let n = 1
  while (taken.has(`State ${n}`)) n++
  return `State ${n}`
}

/**
 * "+ Add state" always passes the canvas centre, so clicking it repeatedly
 * used to pile states on one pixel — they looked like a single node until you
 * dragged the top one away. Step off the pile instead.
 */
function freePosition(states: StateNode[], position: { x: number; y: number }) {
  const occupied = (p: { x: number; y: number }) =>
    states.some(
      (s) => Math.abs(s.position.x - p.x) < 1 && Math.abs(s.position.y - p.y) < 1,
    )
  let p = { ...position }
  for (let i = 0; i < states.length && occupied(p); i++) {
    p = { x: p.x + STACK_OFFSET, y: p.y + STACK_OFFSET }
  }
  return p
}

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
      return {
        ...chain,
        states: [...chain.states, {
          id: crypto.randomUUID(),
          name: nextStateName(chain.states),
          position: freePosition(chain.states, action.position),
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
        inputStateId: chain.inputStateId === action.id ? null : chain.inputStateId,
        outputStateId: chain.outputStateId === action.id ? null : chain.outputStateId,
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
    case 'setInputState':
      return { ...chain, inputStateId: action.id }
    case 'setOutputState':
      return { ...chain, outputStateId: action.id }
    case 'loadChain':
      return action.chain
  }
}
