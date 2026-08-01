import { useState } from 'react'
import { BaseEdge, EdgeLabelRenderer, useInternalNode } from '@xyflow/react'
import type { EdgeProps, InternalNode } from '@xyflow/react'
import { edgeGeometry, pathD, pointAt } from '../lib/edgeGeometry'
import type { Rect } from '../lib/edgeGeometry'

export interface TransitionEdgeData {
  probability: number
  isSelfLoop: boolean
  /** True when a transition in the opposite direction also exists. */
  hasReverse: boolean
  onSetProbability: (p: number) => void
}

function nodeRect(node: InternalNode): Rect {
  const { x, y } = node.internals.positionAbsolute
  const w = node.measured?.width ?? 0
  const h = node.measured?.height ?? 0
  return { cx: x + w / 2, cy: y + h / 2, w, h }
}

/**
 * Floating edge: the line attaches wherever the node borders face each other
 * rather than at fixed handles. All the curve math lives in `edgeGeometry` so
 * the simulation overlay can send players along the exact drawn path.
 */
export function TransitionEdge(props: EdgeProps) {
  const { id, source, target, markerEnd } = props
  const d = props.data as unknown as TransitionEdgeData
  const sourceNode = useInternalNode(source)
  const targetNode = useInternalNode(target)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(d.probability))

  if (!sourceNode || !targetNode) return null

  const geom = edgeGeometry(nodeRect(sourceNode), nodeRect(targetNode), {
    selfLoop: d.isSelfLoop,
    hasReverse: d.hasReverse,
  })
  const label = pointAt(geom, 0.5)

  const commit = () => {
    setEditing(false)
    const p = parseFloat(draft)
    if (!Number.isNaN(p)) d.onSetProbability(p)
  }

  return (
    <>
      <BaseEdge id={id} path={pathD(geom)} markerEnd={markerEnd} />
      <EdgeLabelRenderer>
        <div
          className="edge-label nodrag nopan"
          style={{
            position: 'absolute',
            pointerEvents: 'all',
            transform: `translate(-50%, -50%) translate(${label.x}px, ${label.y}px)`,
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
