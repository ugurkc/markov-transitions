import { useMemo, useState } from 'react'
import type { Chain } from '../../lib/types'
import type { Matrix } from '../../lib/linalg'
import { absorptionAnalysis } from '../../lib/analysis'
import type { AbsorptionResult } from '../../lib/analysis'
import { formatPct } from './format'

interface AbsorptionPanelProps {
  chain: Chain
  matrix: Matrix
  absorbingIds: string[]
}

export function AbsorptionPanel({ chain, matrix, absorbingIds }: AbsorptionPanelProps) {
  const [startChoice, setStartChoice] = useState<string | undefined>(undefined)

  const absorbingSet = useMemo(() => new Set(absorbingIds), [absorbingIds])
  const transientStates = useMemo(
    () => chain.states.filter((s) => !absorbingSet.has(s.id)),
    [chain.states, absorbingSet],
  )
  const startId =
    startChoice !== undefined && transientStates.some((s) => s.id === startChoice)
      ? startChoice
      : transientStates[0]?.id

  const analysis = useMemo<
    { result: AbsorptionResult; error?: undefined } | { result?: undefined; error: string }
  >(() => {
    const absorbingIdx = chain.states
      .map((s, i) => (absorbingSet.has(s.id) ? i : -1))
      .filter((i) => i >= 0)
    try {
      return { result: absorptionAnalysis(matrix, absorbingIdx) }
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  }, [chain.states, matrix, absorbingSet])

  const absorbingNames = absorbingIds
    .map((id) => chain.states.find((s) => s.id === id)?.name ?? id)
    .join(', ')
  const startIdx = chain.states.findIndex((s) => s.id === startId)

  return (
    <div className="panel">
      <h3>Absorption</h3>
      <p className="panel-note">
        This chain has absorbing states ({absorbingNames}) — showing absorption
        analysis. A long-run equilibrium isn&apos;t meaningful here because all
        probability eventually collects in the absorbing states.
      </p>
      {analysis.error !== undefined ? (
        <p className="inline-warning">{analysis.error}</p>
      ) : transientStates.length === 0 ? (
        <p className="panel-note">Every state is absorbing — nothing ever moves.</p>
      ) : (
        <>
          <label className="field">
            Start state{' '}
            <select value={startId ?? ''} onChange={(e) => setStartChoice(e.target.value)}>
              {transientStates.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
          {startIdx >= 0 && (
            <>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Absorbing state</th>
                    <th>P(end up here)</th>
                  </tr>
                </thead>
                <tbody>
                  {chain.states.map((s, j) =>
                    absorbingSet.has(s.id) ? (
                      <tr key={s.id}>
                        <td>{s.name}</td>
                        <td>{formatPct(analysis.result.absorptionProbs[startIdx][j])}</td>
                      </tr>
                    ) : null,
                  )}
                </tbody>
              </table>
              <p>
                Expected steps until absorption:{' '}
                <strong>{analysis.result.expectedSteps[startIdx].toFixed(1)}</strong>
              </p>
            </>
          )}
        </>
      )}
    </div>
  )
}
