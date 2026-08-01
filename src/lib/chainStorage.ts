import type { Chain, StateNode, Transition } from './types'

/**
 * Validate and repair a chain read back from storage.
 *
 * Persisted data outlives the code that wrote it: entries saved by an older
 * build predate fields the app now depends on, and a partial write leaves
 * outright malformed JSON. Casting straight to `Chain` trusted all of that
 * blindly — a chain with no `states` array took the whole page down, and one
 * saved before input/output endpoints existed came back with a permanently
 * dead simulator.
 *
 * Returns `null` when the value is too broken to use, so the caller can fall
 * back to a preset instead of rendering nothing.
 */
export function normalizeChain(raw: unknown, presets: Chain[]): Chain | null {
  if (!isRecord(raw)) return null

  const { id, name, states, transitions } = raw
  if (typeof id !== 'string' || !id) return null
  if (!Array.isArray(states) || !Array.isArray(transitions)) return null

  const cleanStates = states
    .map(toState)
    .filter((s): s is StateNode => s !== null)
  const ids = new Set(cleanStates.map((s) => s.id))
  const cleanTransitions = transitions
    .map((t) => toTransition(t, ids))
    .filter((t): t is Transition => t !== null)

  // A stored copy of a preset can borrow that preset's endpoints, which is
  // what rescues chains saved before the endpoints feature shipped.
  const preset = presets.find((p) => p.id === id)

  return {
    id,
    name: typeof name === 'string' && name ? name : (preset?.name ?? 'My chain'),
    states: cleanStates,
    transitions: cleanTransitions,
    inputStateId: resolveEndpoint(raw.inputStateId, preset?.inputStateId, ids),
    outputStateId: resolveEndpoint(raw.outputStateId, preset?.outputStateId, ids),
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function toState(v: unknown): StateNode | null {
  if (!isRecord(v)) return null
  const { id, name, position } = v
  if (typeof id !== 'string' || !id) return null
  if (typeof name !== 'string') return null
  if (!isRecord(position)) return null
  const { x, y } = position
  if (typeof x !== 'number' || !Number.isFinite(x)) return null
  if (typeof y !== 'number' || !Number.isFinite(y)) return null
  return { id, name, position: { x, y } }
}

/** Transitions are dropped unless both endpoints survived state validation. */
function toTransition(v: unknown, ids: Set<string>): Transition | null {
  if (!isRecord(v)) return null
  const { id, from, to, probability } = v
  if (typeof id !== 'string' || !id) return null
  if (typeof from !== 'string' || !ids.has(from)) return null
  if (typeof to !== 'string' || !ids.has(to)) return null
  if (typeof probability !== 'number' || !Number.isFinite(probability)) return null
  return { id, from, to, probability }
}

/**
 * Keep an endpoint only if it still names a real state. An id left over from
 * a deleted state is dropped rather than kept — a dangling endpoint reads as
 * "set" to the simulation while resolving to nothing, which silently produces
 * wrong retention and lifetime numbers.
 */
function resolveEndpoint(
  stored: unknown,
  presetFallback: string | null | undefined,
  ids: Set<string>,
): string | null {
  if (typeof stored === 'string') return ids.has(stored) ? stored : null
  // Absent entirely — saved before endpoints existed.
  if (stored === undefined && typeof presetFallback === 'string' && ids.has(presetFallback)) {
    return presetFallback
  }
  return null
}
