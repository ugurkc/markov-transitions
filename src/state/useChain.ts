import { useEffect, useReducer, useRef } from 'react'
import type { Chain } from '../lib/types'
import { chainReducer } from './chainReducer'
import { funnelPreset } from '../lib/presets'

const STORAGE_KEY = 'markov-transitions:chain'

function loadInitial(): Chain {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Chain
  } catch { /* corrupt storage → fall through to preset */ }
  return funnelPreset
}

export function useChain() {
  const [chain, dispatch] = useReducer(chainReducer, undefined, loadInitial)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chain))
    }, 300)
    return () => clearTimeout(timer.current)
  }, [chain])
  return { chain, dispatch }
}
