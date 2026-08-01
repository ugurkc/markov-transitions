import { useCallback, useMemo, useRef, useState } from 'react'
import {
  Background,
  ConnectionMode,
  Controls,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react'
import type {
  Connection,
  Edge,
  EdgeChange,
  EdgeTypes,
  Node,
  NodeChange,
  NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { Chain } from '../lib/types'
import { validateChain } from '../lib/chain'
import { presets } from '../lib/presets'
import type { ChainAction } from '../state/chainReducer'
import { StateNode } from './StateNode'
import { TransitionEdge } from './TransitionEdge'

const nodeTypes: NodeTypes = { state: StateNode }
const edgeTypes: EdgeTypes = { transition: TransitionEdge }

interface ChainCanvasProps {
  chain: Chain
  dispatch: React.Dispatch<ChainAction>
}

function ChainCanvasInner({ chain, dispatch }: ChainCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition } = useReactFlow()
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  // React Flow measures nodes and reports sizes via 'dimensions' changes. Since we
  // rebuild the nodes array from the chain on every render, we must echo those
  // measurements back — otherwise re-adopted nodes count as unmeasured and every
  // edge disappears until the next resize.
  const measuredRef = useRef(new Map<string, { width: number; height: number }>())
  const [presetId, setPresetId] = useState(
    () => presets.find((p) => p.id === chain.id)?.id ?? presets[0].id,
  )

  const validation = useMemo(() => validateChain(chain), [chain])

  const nodes = useMemo<Node[]>(
    () =>
      chain.states.map((s) => ({
        id: s.id,
        type: 'state',
        position: s.position,
        selected: selected.has(s.id),
        measured: measuredRef.current.get(s.id),
        data: {
          name: s.name,
          invalid: validation.invalidStateIds.includes(s.id),
          rowSum: validation.rowSums[s.id] ?? 0,
          onRename: (name: string) => dispatch({ type: 'renameState', id: s.id, name }),
        },
      })),
    [chain.states, selected, validation, dispatch],
  )

  const edges = useMemo<Edge[]>(
    () =>
      chain.transitions.map((t) => ({
        id: t.id,
        type: 'transition',
        source: t.from,
        target: t.to,
        selected: selected.has(t.id),
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
          probability: t.probability,
          isSelfLoop: t.from === t.to,
          onSetProbability: (p: number) =>
            dispatch({ type: 'setProbability', id: t.id, probability: p }),
        },
      })),
    [chain.transitions, selected, dispatch],
  )

  const updateSelection = useCallback((id: string, isSelected: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (isSelected) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      for (const change of changes) {
        if (change.type === 'position' && change.position) {
          dispatch({ type: 'moveState', id: change.id, position: change.position })
        } else if (change.type === 'select') {
          updateSelection(change.id, change.selected)
        } else if (change.type === 'dimensions') {
          if (change.dimensions) measuredRef.current.set(change.id, change.dimensions)
        } else if (change.type === 'remove') {
          measuredRef.current.delete(change.id)
          dispatch({ type: 'deleteState', id: change.id })
        }
      }
    },
    [dispatch, updateSelection],
  )

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      for (const change of changes) {
        if (change.type === 'remove') {
          dispatch({ type: 'deleteTransition', id: change.id })
        } else if (change.type === 'select') {
          updateSelection(change.id, change.selected)
        }
      }
    },
    [dispatch, updateSelection],
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        dispatch({ type: 'addTransition', from: connection.source, to: connection.target })
      }
    },
    [dispatch],
  )

  const onPaneDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      // Only when the double-click landed on the empty pane itself — nodes, edge
      // labels, and controls are children of the pane, so `closest()` would match
      // them too and every label double-click would spawn a state.
      if ((e.target as HTMLElement).classList.contains('react-flow__pane')) {
        dispatch({
          type: 'addState',
          position: screenToFlowPosition({ x: e.clientX, y: e.clientY }),
        })
      }
    },
    [dispatch, screenToFlowPosition],
  )

  const addStateAtCenter = useCallback(() => {
    const rect = wrapperRef.current?.getBoundingClientRect()
    if (!rect) return
    dispatch({
      type: 'addState',
      position: screenToFlowPosition({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      }),
    })
  }, [dispatch, screenToFlowPosition])

  const loadPreset = useCallback(
    (id: string) => {
      const preset = presets.find((p) => p.id === id)
      if (!preset) return
      if (!window.confirm(`Load "${preset.name}"? This replaces the current chain.`)) return
      setPresetId(id)
      setSelected(new Set())
      dispatch({ type: 'loadChain', chain: structuredClone(preset) })
    },
    [dispatch],
  )

  return (
    <div>
      <div className="canvas-toolbar">
        <button type="button" onClick={addStateAtCenter}>+ Add state</button>
        <select
          value={presetId}
          onChange={(e) => loadPreset(e.target.value)}
          aria-label="Preset"
        >
          {presets.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <button type="button" onClick={() => loadPreset(presetId)}>Reset to preset</button>
      </div>
      <div
        ref={wrapperRef}
        style={{ width: '100%', height: 480 }}
        onDoubleClick={onPaneDoubleClick}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          connectionMode={ConnectionMode.Loose}
          deleteKeyCode={['Backspace', 'Delete']}
          zoomOnDoubleClick={false}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  )
}

export function ChainCanvas(props: ChainCanvasProps) {
  return (
    <ReactFlowProvider>
      <ChainCanvasInner {...props} />
    </ReactFlowProvider>
  )
}
