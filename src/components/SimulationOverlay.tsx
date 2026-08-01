import { useStore } from '@xyflow/react'
import type { Chain } from '../lib/types'
import { edgeGeometry, pointAt } from '../lib/edgeGeometry'
import type { Rect } from '../lib/edgeGeometry'
import type { Arrival, Move } from '../lib/simulation'

interface SimulationOverlayProps {
  chain: Chain
  moves: Move[]
  arrivals: Arrival[]
  /** 0..1 through the current period. */
  progress: number
  visible: boolean
}

/** Most tokens drawn for a single move — a crowd reads as a crowd well before this. */
const MAX_DOTS_PER_MOVE = 10
/** How far apart trailing tokens sit along the path. */
const DOT_STAGGER = 0.045
/** How far off the path the flow count sits, clear of the probability pill. */
const LABEL_OFFSET = 21
/** How far above the node the "+N joined" label floats. */
const ARRIVAL_LABEL_OFFSET = 15
/** Loosely scattered, rather than stacked dead-center, so a burst of new
 * arrivals reads as a little crowd rather than one dot standing in for all. */
const ARRIVAL_SCATTER: [number, number][] = [
  [0, 0], [-7, 4], [6, -5], [-4, -6], [8, 5],
  [-9, -1], [3, 8], [-2, -8], [9, -3], [-6, 7],
]

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
  arrivals,
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

  const dots: { key: string; x: number; y: number; r: number; opacity: number }[] = []
  const labels: { key: string; x: number; y: number; count: number }[] = []
  const arrivalLabels: { key: string; x: number; y: number; count: number }[] = []

  if (visible) {
    for (const move of moves) {
      const fromState = chain.states[move.from]
      const toState = chain.states[move.to]
      if (!fromState || !toState) continue
      const s = rects.get(fromState.id)
      const t = rects.get(toState.id)
      if (!s || !t) continue

      const selfLoop = move.from === move.to
      const hasReverse = !selfLoop && forward.has(`${toState.id}->${fromState.id}`)
      // Travellers run centre-to-centre so they are seen arriving *inside* the
      // destination instead of stopping short at its border. Self-loops keep
      // the drawn arc: those players never leave, and routing them through the
      // node would just scribble over its own population count.
      const geom = edgeGeometry(s, t, {
        selfLoop,
        hasReverse,
        endpoints: selfLoop ? 'border' : 'center',
      })
      // Counts ride the drawn edge, so they stay clear of node interiors.
      const labelGeom = selfLoop ? geom : edgeGeometry(s, t, { selfLoop, hasReverse })

      const n = Math.min(move.count, MAX_DOTS_PER_MOVE)
      // Every token, including the last of a staggered trail, completes its
      // trip within the period — otherwise the stragglers get cut off when
      // the next period's moves take over.
      const span = Math.max(0.2, 1 - (n - 1) * DOT_STAGGER)
      // Bigger flows get slightly fatter tokens, so a 200-player stream still
      // reads as heavier than a 3-player trickle once both are dot-capped.
      const r = 3.2 + Math.min(2.6, Math.log2(move.count + 1) * 0.6)
      for (let k = 0; k < n; k++) {
        const t01 = Math.max(0, Math.min(1, (progress - k * DOT_STAGGER) / span))
        const p = pointAt(geom, smoothstep(t01))
        dots.push({ key: `${move.from}-${move.to}-${k}`, x: p.x, y: p.y, r, opacity: 1 })
      }

      // Offset the count perpendicular to the path so it clears the
      // probability pill that already sits at the midpoint.
      const mid = pointAt(labelGeom, 0.5)
      const before = pointAt(labelGeom, 0.46)
      const after = pointAt(labelGeom, 0.54)
      const dx = after.x - before.x
      const dy = after.y - before.y
      const len = Math.hypot(dx, dy) || 1
      labels.push({
        key: `${move.from}-${move.to}`,
        x: mid.x + (-dy / len) * LABEL_OFFSET,
        y: mid.y + (dx / len) * LABEL_OFFSET,
        count: move.count,
      })
    }

    // New players have nowhere to travel *from* — they simply materialize in
    // their destination, so they fade and grow into place rather than
    // sliding in along a path.
    for (const arrival of arrivals) {
      const toState = chain.states[arrival.to]
      if (!toState) continue
      const t = rects.get(toState.id)
      if (!t) continue

      const eased = smoothstep(progress)
      const n = Math.min(arrival.count, MAX_DOTS_PER_MOVE)
      const r = 3.2 + Math.min(2.6, Math.log2(arrival.count + 1) * 0.6)
      for (let k = 0; k < n; k++) {
        const [ox, oy] = ARRIVAL_SCATTER[k % ARRIVAL_SCATTER.length]
        dots.push({
          key: `arrival-${arrival.to}-${k}`,
          x: t.cx + ox,
          y: t.cy + oy,
          r: r * (0.4 + 0.6 * eased),
          opacity: 0.15 + 0.85 * eased,
        })
      }

      arrivalLabels.push({
        key: `arrival-label-${arrival.to}`,
        x: t.cx,
        y: t.cy - t.h / 2 - ARRIVAL_LABEL_OFFSET,
        count: arrival.count,
      })
    }
  }

  if (dots.length === 0) return null

  return (
    <svg className="sim-overlay" aria-hidden="true">
      <g transform={`translate(${tx}, ${ty}) scale(${zoom})`}>
        {dots.map((d) => (
          <circle
            key={d.key}
            className="sim-dot"
            cx={d.x}
            cy={d.y}
            r={d.r}
            opacity={d.opacity}
          />
        ))}
        {arrivalLabels.map((l) => (
          <text
            key={l.key}
            className="sim-flow-label sim-arrival-label"
            x={l.x}
            y={l.y}
            textAnchor="middle"
            dominantBaseline="central"
          >
            +{l.count}
          </text>
        ))}
        {labels.map((l) => (
          <text
            key={l.key}
            className="sim-flow-label"
            x={l.x}
            y={l.y}
            textAnchor="middle"
            dominantBaseline="central"
          >
            {l.count}
          </text>
        ))}
      </g>
    </svg>
  )
}
