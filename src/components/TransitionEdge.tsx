import { useState } from 'react'
import { BaseEdge, EdgeLabelRenderer, useInternalNode } from '@xyflow/react'
import type { EdgeProps, InternalNode } from '@xyflow/react'

export interface TransitionEdgeData {
  probability: number
  isSelfLoop: boolean
  /** True when a transition in the opposite direction also exists. */
  hasReverse: boolean
  onSetProbability: (p: number) => void
}

interface Rect {
  cx: number
  cy: number
  w: number
  h: number
}

function nodeRect(node: InternalNode): Rect {
  const { x, y } = node.internals.positionAbsolute
  const w = node.measured?.width ?? 0
  const h = node.measured?.height ?? 0
  return { cx: x + w / 2, cy: y + h / 2, w, h }
}

/** Point where a ray from the rect's center toward (tx, ty) exits the rect. */
function borderPoint(rect: Rect, tx: number, ty: number, pad = 3): { x: number; y: number } {
  const dx = tx - rect.cx
  const dy = ty - rect.cy
  const scale = Math.max(
    Math.abs(dx) / (rect.w / 2 + pad),
    Math.abs(dy) / (rect.h / 2 + pad),
  )
  if (scale === 0) return { x: rect.cx, y: rect.cy }
  return { x: rect.cx + dx / scale, y: rect.cy + dy / scale }
}

/**
 * Floating edge: instead of fixed handles, the line attaches wherever the
 * node borders face each other — straight lines that never detour through
 * a node's top/bottom, which is what tangled the graph before. Bidirectional
 * pairs bow apart into a lens; self-loops arc off the node's right side.
 */
export function TransitionEdge(props: EdgeProps) {
  const { id, source, target, markerEnd } = props
  const d = props.data as unknown as TransitionEdgeData
  const sourceNode = useInternalNode(source)
  const targetNode = useInternalNode(target)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(d.probability))

  if (!sourceNode || !targetNode) return null
  const s = nodeRect(sourceNode)
  const t = nodeRect(targetNode)

  let path: string, labelX: number, labelY: number
  if (d.isSelfLoop) {
    // Arc looping off the node's right side.
    const sx = s.cx + s.w / 2
    const r = 44
    path = `M ${sx} ${s.cy - 9} C ${sx + r} ${s.cy - r * 0.9}, ${sx + r} ${s.cy + r * 0.9}, ${sx} ${s.cy + 9}`
    labelX = sx + r * 0.82
    labelY = s.cy
  } else if (d.hasReverse) {
    // Bow to the right of travel so the reversed edge (bowing the other way)
    // separates into a lens with one label per curve.
    const from = borderPoint(s, t.cx, t.cy)
    const to = borderPoint(t, s.cx, s.cy)
    const dx = to.x - from.x
    const dy = to.y - from.y
    const len = Math.hypot(dx, dy) || 1
    const nx = -dy / len
    const ny = dx / len
    const bow = 26
    const cx = (from.x + to.x) / 2 + nx * bow * 2
    const cy = (from.y + to.y) / 2 + ny * bow * 2
    path = `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`
    labelX = (from.x + to.x) / 2 + nx * bow
    labelY = (from.y + to.y) / 2 + ny * bow
  } else {
    const from = borderPoint(s, t.cx, t.cy)
    const to = borderPoint(t, s.cx, s.cy)
    path = `M ${from.x} ${from.y} L ${to.x} ${to.y}`
    labelX = (from.x + to.x) / 2
    labelY = (from.y + to.y) / 2
  }

  const commit = () => {
    setEditing(false)
    const p = parseFloat(draft)
    if (!Number.isNaN(p)) d.onSetProbability(p)
  }

  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} />
      <EdgeLabelRenderer>
        <div
          className="edge-label nodrag nopan"
          style={{
            position: 'absolute',
            pointerEvents: 'all',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          }}
          onClick={() => {
            if (editing) return
            setDraft(String(d.probability))
            setEditing(true)
          }}
        >
          {editing ? (
            <input
              autoFocus
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commit()
                if (e.key === 'Escape') setEditing(false)
              }}
            />
          ) : (
            <span>{d.probability}</span>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
