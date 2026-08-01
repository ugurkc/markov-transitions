import { useEffect, useReducer, useRef } from 'react'
import type { Chain } from '../lib/types'
import { chainReducer } from './chainReducer'
import { normalizeChain } from '../lib/chainStorage'
import { funnelPreset, presets } from '../lib/presets'

const STORAGE_KEY = 'watershed:chain'
const CUSTOM_STORAGE_KEY = 'watershed:custom-chain'
// Read once for visitors with a chain saved under the pre-rename keys, so
// the rebrand doesn't quietly discard anyone's in-progress custom chain.
const LEGACY_STORAGE_KEY = 'markov-transitions:chain'
const LEGACY_CUSTOM_STORAGE_KEY = 'markov-transitions:custom-chain'

/**
 * Everything read back from storage goes through `normalizeChain` — it was
 * written by whatever version of the app the visitor last used, so it may be
 * missing fields the code now requires, or be a half-written record.
 */
function readStored(key: string, legacyKey: string): Chain | null {
  try {
    const raw = localStorage.getItem(key) ?? localStorage.getItem(legacyKey)
    if (!raw) return null
    return normalizeChain(JSON.parse(raw), presets)
  } catch { /* unparseable → treat as absent */ }
  return null
}

function loadInitial(): Chain {
  return readStored(STORAGE_KEY, LEGACY_STORAGE_KEY) ?? funnelPreset
}

/** The user's own chain, saved separately from whichever chain is currently
 * on screen so it survives switching to a preset and back. */
export function loadSavedCustomChain(): Chain | null {
  return readStored(CUSTOM_STORAGE_KEY, LEGACY_CUSTOM_STORAGE_KEY)
}

function persist(chain: Chain) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chain))
  if (chain.id === 'custom') {
    localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(chain))
  }
}

/** Writes immediately, bypassing the debounce — call before navigating away
 * from a custom chain so a very recent edit is never lost to the switch. */
export function flushCustomChain(chain: Chain): void {
  if (chain.id === 'custom') persist(chain)
}

export function useChain() {
  const [chain, dispatch] = useReducer(chainReducer, undefined, loadInitial)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => persist(chain), 300)
    return () => clearTimeout(timer.current)
  }, [chain])
  return { chain, dispatch }
}
