import { useEffect, useReducer, useRef } from 'react'
import type { Chain } from '../lib/types'
import { chainReducer } from './chainReducer'
import { funnelPreset } from '../lib/presets'

const STORAGE_KEY = 'markov-transitions:chain'
const CUSTOM_STORAGE_KEY = 'markov-transitions:custom-chain'

function loadInitial(): Chain {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Chain
  } catch { /* corrupt storage → fall through to preset */ }
  return funnelPreset
}

/** The user's own chain, saved separately from whichever chain is currently
 * on screen so it survives switching to a preset and back. */
export function loadSavedCustomChain(): Chain | null {
  try {
    const raw = localStorage.getItem(CUSTOM_STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Chain
  } catch { /* corrupt storage → treat as absent */ }
  return null
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
