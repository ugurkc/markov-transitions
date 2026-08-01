import { useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'

export interface StateNodeData {
  name: string
  invalid: boolean
  rowSum: number
  /** Live simulated population; omitted when no cohort is loaded. */
  count?: number
  onRename: (name: string) => void
}

export function StateNode({ data }: NodeProps) {
  const d = data as unknown as StateNodeData
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(d.name)
  const commit = () => {
    setEditing(false)
    if (draft.trim()) d.onRename(draft.trim())
  }
  return (
    <div
      className={`state-node${d.invalid ? ' invalid' : ''}`}
      onDoubleClick={(e) => {
        e.stopPropagation()
        if (editing) return
        setDraft(d.name)
        setEditing(true)
      }}
    >
      {/* Rendered edges float around the node border; these handles exist to
          start/finish connection drags from any side (ConnectionMode.Loose). */}
      <Handle id="top" type="source" position={Position.Top} />
      <Handle id="right" type="source" position={Position.Right} />
      <Handle id="bottom" type="source" position={Position.Bottom} />
      <Handle id="left" type="source" position={Position.Left} />
      {editing ? (
        <input
          className="nodrag"
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') setEditing(false)
          }}
        />
      ) : (
        <span>{d.name}</span>
      )}
      {d.count !== undefined && (
        <div className="state-count">
          {d.count}
          <span className="state-count-unit">
            {d.count === 1 ? 'player' : 'players'}
          </span>
        </div>
      )}
      {d.invalid && <div className="row-sum-badge">Σ = {d.rowSum.toFixed(2)}</div>}
    </div>
  )
}
