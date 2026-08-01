import { useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'

export interface StateNodeData {
  name: string
  invalid: boolean
  rowSum: number
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
        setDraft(d.name)
        setEditing(true)
      }}
    >
      <Handle type="target" position={Position.Top} />
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
      {d.invalid && <div className="row-sum-badge">Σ = {d.rowSum.toFixed(2)}</div>}
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}
