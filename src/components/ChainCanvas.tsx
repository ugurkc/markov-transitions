import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { onPresetRequest, onScenarioRequest } from '../lib/toolBridge'
import { buildScenarioChain, getScenario } from '../lib/scenarios'
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
  const { screenToFlowPosition, fitView } = useReactFlow()
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  // React Flow measures nodes and reports sizes via 'dimensions' changes. Since we
  // rebuild the nodes array from the chain on every render, we must echo those
  // measurements back — otherwise re-adopted nodes count as unmeasured and every
  // edge disappears until the next resize.
  const measuredRef = useRef(new Map<string, { width: number; height: number }>())

  const validation = useMemo(() => validateChain(chain), [chain])

  /** Re-frame after React has committed and React Flow has measured. */
  const refit = useCallback(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => fitView({ duration: 0 })))
  }, [fitView])

  // The initial `fitView` runs against whatever size the canvas happened to
  // be at mount, so a later layout change (window resize, the two-column
  // breakpoint flipping) leaves nodes cropped outside the visible area.
  useEffect(() => {
    const el = wrapperRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    let first = true
    let raf = 0
    const ro = new ResizeObserver(() => {
      if (first) {
        first = false // the observer fires once on attach; mount already fit.
        return
      }
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => fitView({ duration: 0 }))
    })
    ro.observe(el)
    return () => {
      ro.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [fitView])

  const showCounts =
    sim.runnable && (sim.initialCounts.some((n) => n > 0) || sim.inputRate > 0)

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
          isInput: s.id === chain.inputStateId,
          isOutput: s.id === chain.outputStateId,
          onRename: (name: string) => dispatch({ type: 'renameState', id: s.id, name }),
        },
      })),
    [
      chain.states,
      chain.inputStateId,
      chain.outputStateId,
      selected,
      validation,
      dispatch,
      showCounts,
      sim.displayCounts,
    ],
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
  // Clicking the tab of the preset already on screen reloads it. A preset
  // that has been edited flips the chain to `custom`, so an active preset tab
  // always means an untouched preset — reloading it can only reset layout,
  // and it doubles as the way out if a stored chain ever loads in a state the
  // pickers can't express.
  const loadPreset = useCallback(
    (id: string) => {
      const preset = presets.find((p) => p.id === id)
      if (!preset) return
      flushCustomChain(chain)
      setSelected(new Set())
      measuredRef.current.clear()
      dispatch({ type: 'loadChain', chain: structuredClone(preset) })
      refit()
    },
    [dispatch, chain, refit],
  )

  // The essay's ToolLinks can request a preset switch ("switch to the
  // win-back preset" in the prose actually switches it) — see toolBridge.ts.
  useEffect(() => onPresetRequest(loadPreset), [loadPreset])

  // Same bridge, richer payload: the essay's before/after chips load a
  // preset with the one edit the prose is discussing (see lib/scenarios.ts).
  // Mirrors loadPreset exactly — flush, clear selection, swap, refit.
  const loadScenario = useCallback(
    (id: string) => {
      const scenario = getScenario(id)
      if (!scenario) return
      flushCustomChain(chain)
      setSelected(new Set())
      measuredRef.current.clear()
      dispatch({ type: 'loadChain', chain: buildScenarioChain(scenario) })
      refit()
    },
    [dispatch, chain, refit],
  )

  useEffect(() => onScenarioRequest(loadScenario), [loadScenario])

  const startCustom = useCallback(() => {
    if (chain.id === 'custom') return
    const saved = loadSavedCustomChain()
    setSelected(new Set())
    measuredRef.current.clear()
    dispatch({
      type: 'loadChain',
      chain: saved ?? {
        id: 'custom',
        name: 'My chain',
        states: [],
        transitions: [],
        inputStateId: null,
        outputStateId: null,
      },
    })
    refit()
  }, [dispatch, chain.id, refit])

  return (
    <div data-tool-anchor="canvas">
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
