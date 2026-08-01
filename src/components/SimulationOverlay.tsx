import { useStore } from '@xyflow/react'
import type { Chain } from '../lib/types'
import { edgeGeometry, pointAt } from '../lib/edgeGeometry'
import type { Rect } from '../lib/edgeGeometry'
import type { Move } from '../lib/simulation'

interface SimulationOverlayProps {
  chain: Chain
  moves: Move[]
  /** 0..1 through the current period. */
  progress: number
  visible: boolean
}

/** Most tokens drawn for a single move — a crowd reads as a crowd well before this. */
const MAX_DOTS_PER_MOVE = 10
/** How far apart trailing tokens sit along the path. */
const DOT_STAGGER = 0.05

/** Ease-in-out so players accelerate away and settle into the target. */
const smoothstep = (t: number) => t * t * (3 - 2 * t)

/**
 * Draws the players moving between states for the current period, on top of
 * the graph. Positions come from the same `edgeGeometry` the edges are drawn
 * with, so tokens travel exactly along the visible curves.
 *
 * Nothing here is memoized: React Flow mutates its node lookup in place, so a
 * cache keyed on it would hold the pre-measurement (empty) result forever.
 * With a handful of states this recomputes in microseconds per frame.
 */
export function SimulationOverlay({
  chain,
  moves,
  progress,
  visible,
}: SimulationOverlayProps) {
  // The authoritative node sizes and absolute positions — the same source the
  // edges are drawn from, so tokens can't drift off the curves.
  const nodeLookup = useStore((s) => s.nodeLookup)
  // Take the viewport as three primitives: selecting the tuple itself would
  // hand back a fresh array on every store tick.
  const tx = useStore((s) => s.transform[0])
  const ty = useStore((s) => s.transform[1])
  const zoom = useStore((s) => s.transform[2])

  const rects = new Map<string, Rect>()
  for (const n of nodeLookup.values()) {
    const w = n.measured?.width ?? 0
    const h = n.measured?.height ?? 0
    if (!w || !h) continue
    const { x, y } = n.internals.positionAbsolute
    rects.set(n.id, { cx: x + w / 2, cy: y + h / 2, w, h })
  }

  const forward = new Set(chain.transitions.map((t) => `${t.from}->${t.to}`))

  const dots: { key: string; x: number; y: number; r: number }[] = []
  if (visible) {
    for (const move of moves) {
      const fromState = chain.states[move.from]
      const toState = chain.states[move.to]
      if (!fromState || !toState) continue
      const s = rects.get(fromState.id)
      const t = rects.get(toState.id)
      if (!s || !t) continue

      const selfLoop = move.from === move.to
      const geom = edgeGeometry(s, t, {
        selfLoop,
        hasReverse: !selfLoop && forward.has(`${toState.id}->${fromState.id}`),
      })

      const n = Math.min(move.count, MAX_DOTS_PER_MOVE)
      // Bigger flows get slightly fatter tokens, so a 200-player stream still
      // reads as heavier than a 3-player trickle once both are dot-capped.
      const r = 3.2 + Math.min(2.6, Math.log2(move.count + 1) * 0.6)
      for (let k = 0; k < n; k++) {
        const t01 = Math.max(0, Math.min(1, progress - k * DOT_STAGGER))
        const p = pointAt(geom, smoothstep(t01))
        dots.push({ key: `${move.from}-${move.to}-${k}`, x: p.x, y: p.y, r })
      }
    }
  }

  if (dots.length === 0) return null

  return (
    <svg className="sim-overlay" aria-hidden="true">
      <g transform={`translate(${tx}, ${ty}) scale(${zoom})`}>
        {dots.map((d) => (
          <circle key={d.key} className="sim-dot" cx={d.x} cy={d.y} r={d.r} />
        ))}
      </g>
    </svg>
  )
}
