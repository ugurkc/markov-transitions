import { useEffect, useState } from 'react'
import type { Chain } from '../lib/types'
import { buildMatrix, validateChain, PROB_TOLERANCE } from '../lib/chain'
import type { ChainAction } from '../state/chainReducer'

interface MatrixPanelProps {
  chain: Chain
  dispatch: React.Dispatch<ChainAction>
}

interface CellProps {
  value: number
  ariaLabel: string
  onCommit: (p: number) => void
}

/** One editable probability cell; commits on blur or Enter. */
function Cell({ value, ariaLabel, onCommit }: CellProps) {
  const [focused, setFocused] = useState(false)
  const [draft, setDraft] = useState(value === 0 ? '' : String(value))

  // Keep the draft in sync with outside edits (canvas, presets) — but never
  // while the user is typing in this cell.
  useEffect(() => {
    if (!focused) setDraft(value === 0 ? '' : String(value))
  }, [value, focused])

  const commit = () => {
    const p = draft.trim() === '' ? 0 : parseFloat(draft)
    if (!Number.isNaN(p)) onCommit(p)
  }

  return (
    <input
      className="matrix-cell"
      type="number"
      min={0}
      max={1}
      step={0.05}
      placeholder="0"
      aria-label={ariaLabel}
      value={draft}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false)
        commit()
      }}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        if (e.key === 'Escape') {
          setDraft(value === 0 ? '' : String(value))
          ;(e.target as HTMLInputElement).blur()
        }
      }}
    />
  )
}

/**
 * Editable transition-matrix view of the chain. Each row is a "from" state;
 * reading across the row gives the chances of where such a player goes next
 * step. Edits are written straight back to the chain, so the canvas and the
 * table always agree.
 */
export function MatrixPanel({ chain, dispatch }: MatrixPanelProps) {
  if (chain.states.length === 0) return null

  const matrix = buildMatrix(chain)
  const validation = validateChain(chain)

  // A concrete plain-language example, built from the first off-diagonal
  // nonzero probability so it always matches what the table shows.
  let example: { from: string; to: string; p: number } | null = null
  outer: for (let i = 0; i < chain.states.length; i++) {
    for (let j = 0; j < chain.states.length; j++) {
      if (i !== j && matrix[i][j] > 0) {
        example = { from: chain.states[i].name, to: chain.states[j].name, p: matrix[i][j] }
        break outer
      }
    }
  }

  return (
    <div className="panel matrix-panel">
      <h3>Transition matrix</h3>
      <p className="panel-note">
        Each cell is the chance that a player currently in the row&apos;s state
        will be in the column&apos;s state one step later. Every row must total
        1 — a player always goes <em>somewhere</em>, even if that means staying
        put (the diagonal).
        {example && (
          <>
            {' '}For example: a player in <strong>{example.from}</strong> has a{' '}
            <strong>{(example.p * 100).toFixed(0)}%</strong> chance of moving to{' '}
            <strong>{example.to}</strong> next step.
          </>
        )}
      </p>
      <table className="data-table matrix-table">
        <thead>
          <tr>
            <th scope="col" className="matrix-corner">from \ to</th>
            {chain.states.map((s) => (
              <th scope="col" key={s.id}>{s.name}</th>
            ))}
            <th scope="col">Σ</th>
          </tr>
        </thead>
        <tbody>
          {chain.states.map((from, i) => {
            const rowSum = validation.rowSums[from.id] ?? 0
            const rowOk = Math.abs(rowSum - 1) <= PROB_TOLERANCE
            return (
              <tr key={from.id}>
                <th scope="row">{from.name}</th>
                {chain.states.map((to, j) => (
                  <td key={to.id} className={i === j ? 'matrix-diagonal' : undefined}>
                    <Cell
                      value={matrix[i][j]}
                      ariaLabel={`Chance of moving from ${from.name} to ${to.name}`}
                      onCommit={(p) =>
                        dispatch({ type: 'setCell', from: from.id, to: to.id, probability: p })
                      }
                    />
                  </td>
                ))}
                <td className={rowOk ? 'matrix-sum ok' : 'matrix-sum bad'}>
                  {rowSum.toFixed(2)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
