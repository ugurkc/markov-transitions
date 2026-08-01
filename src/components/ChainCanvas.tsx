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
import { flushCustomChain, loadSavedCustomChain } from '../state/useChain'
import type { Simulation } from '../state/useSimulation'
import type { Theme } from '../state/useTheme'
import { SimulationOverlay } from './SimulationOverlay'
import { StateNode } from './StateNode'
import { TransitionEdge } from './TransitionEdge'

const nodeTypes: NodeTypes = { state: StateNode }
const edgeTypes: EdgeTypes = { transition: TransitionEdge }

interface ChainCanvasProps {
  chain: Chain
  dispatch: React.Dispatch<ChainAction>
  theme: Theme
  sim: Simulation
}

function ChainCanvasInner({ chain, dispatch, theme, sim }: ChainCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition } = useReactFlow()
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  // React Flow measures nodes and reports sizes via 'dimensions' changes. Since we
  // rebuild the nodes array from the chain on every render, we must echo those
  // measurements back — otherwise re-adopted nodes count as unmeasured and every
  // edge disappears until the next resize.
  const measuredRef = useRef(new Map<string, { width: number; height: number }>())

  const validation = useMemo(() => validateChain(chain), [chain])

  const showCounts =
    sim.runnable &&
    (sim.initialCounts.some((n) => n > 0) || sim.acquisition.some((n) => n > 0))

  const nodes = useMemo<Node[]>(
    () =>
      chain.states.map((s, i) => ({
        id: s.id,
        type: 'state',
        position: s.position,
        selected: selected.has(s.id),
        measured: measuredRef.current.get(s.id),
        data: {
          name: s.name,
          invalid: validation.invalidStateIds.includes(s.id),
          rowSum: validation.rowSums[s.id] ?? 0,
          count: showCounts ? (sim.displayCounts[i] ?? 0) : undefined,
          onRename: (name: string) => dispatch({ type: 'renameState', id: s.id, name }),
        },
      })),
    [chain.states, selected, validation, dispatch, showCounts, sim.displayCounts],
  )

  const edges = useMemo<Edge[]>(() => {
    const pairs = new Set(chain.transitions.map((t) => `${t.from}->${t.to}`))
    return chain.transitions.map((t) => ({
      id: t.id,
      type: 'transition',
      source: t.from,
      target: t.to,
      selected: selected.has(t.id),
      markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
      data: {
        probability: t.probability,
        isSelfLoop: t.from === t.to,
        hasReverse: t.from !== t.to && pairs.has(`${t.to}->${t.from}`),
        onSetProbability: (p: number) =>
          dispatch({ type: 'setProbability', id: t.id, probability: p }),
      },
    }))
  }, [chain.transitions, selected, dispatch])

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

  // Your custom chain is saved separately from whichever chain is on screen
  // (see useChain), so switching tabs never loses it — no confirmation needed.
  const loadPreset = useCallback(
    (id: string) => {
      const preset = presets.find((p) => p.id === id)
      if (!preset || chain.id === id) return
      flushCustomChain(chain)
      setSelected(new Set())
      measuredRef.current.clear()
      dispatch({ type: 'loadChain', chain: structuredClone(preset) })
    },
    [dispatch, chain],
  )

  const startCustom = useCallback(() => {
    if (chain.id === 'custom') return
    const saved = loadSavedCustomChain()
    setSelected(new Set())
    measuredRef.current.clear()
    dispatch({
      type: 'loadChain',
      chain: saved ?? { id: 'custom', name: 'My chain', states: [], transitions: [] },
    })
  }, [dispatch, chain.id])

  return (
    <div>
      <div className="preset-bar" role="group" aria-label="Chain presets">
        {presets.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`preset-tab${chain.id === p.id ? ' active' : ''}`}
            onClick={() => loadPreset(p.id)}
          >
            {p.name}
          </button>
        ))}
        <button
          type="button"
          className={`preset-tab${chain.id === 'custom' ? ' active' : ''}`}
          onClick={startCustom}
        >
          Build your own
        </button>
      </div>
      <div className="canvas-toolbar">
        <button type="button" onClick={addStateAtCenter}>+ Add state</button>
      </div>
      <div
        ref={wrapperRef}
        className="canvas-wrapper"
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
          colorMode={theme}
          proOptions={{ hideAttribution: true }}
          fitView
        >
          <Background />
          <Controls />
          <SimulationOverlay
            chain={chain}
            moves={sim.moves}
            arrivals={sim.arrivals}
            progress={sim.progress}
            visible={sim.playing || sim.progress > 0}
          />
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
