import { useState } from 'react'
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/react'
import type { EdgeProps } from '@xyflow/react'

export interface TransitionEdgeData {
  probability: number
  isSelfLoop: boolean
  /** True when a transition in the opposite direction also exists. */
  hasReverse: boolean
  onSetProbability: (p: number) => void
}

export function TransitionEdge(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, markerEnd } = props
  const d = props.data as unknown as TransitionEdgeData
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(d.probability))

  let path: string, labelX: number, labelY: number
  if (d.isSelfLoop) {
    // Arc looping from the bottom handle around the node's right side to the top handle.
    const r = 42
    path = `M ${sourceX} ${sourceY} C ${sourceX + r * 2} ${sourceY + r}, ${targetX + r * 2} ${targetY - r}, ${targetX} ${targetY}`
    labelX = sourceX + r * 1.9
    labelY = (sourceY + targetY) / 2
  } else if (d.hasReverse) {
    // A reverse transition exists, so the default bezier paths (and their
    // midpoint labels) would sit on top of each other. Bow this edge to the
    // right of its travel direction — the reversed edge bows the opposite way,
    // separating the pair into a lens with one label per curve.
    const dx = targetX - sourceX
    const dy = targetY - sourceY
    const len = Math.hypot(dx, dy) || 1
    const nx = -dy / len
    const ny = dx / len
    const bow = 30
    const cx = (sourceX + targetX) / 2 + nx * bow * 2
    const cy = (sourceY + targetY) / 2 + ny * bow * 2
    path = `M ${sourceX} ${sourceY} Q ${cx} ${cy} ${targetX} ${targetY}`
    // Quadratic bezier at t=0.5 — the curve's apex, where the label belongs.
    labelX = (sourceX + targetX) / 2 + nx * bow
    labelY = (sourceY + targetY) / 2 + ny * bow
  } else {
    ;[path, labelX, labelY] = getBezierPath(props)
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
