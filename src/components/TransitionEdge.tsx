import { useState } from 'react'
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/react'
import type { EdgeProps } from '@xyflow/react'

export interface TransitionEdgeData {
  probability: number
  isSelfLoop: boolean
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
