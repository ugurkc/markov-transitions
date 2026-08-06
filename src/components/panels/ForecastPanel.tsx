import { useMemo, useState } from 'react'
import type { Chain } from '../../lib/types'
import type { Matrix } from '../../lib/linalg'
import { nStepForecast } from '../../lib/analysis'
import { DistributionBars } from './DistributionBars'

interface ForecastPanelProps {
  chain: Chain
  matrix: Matrix
}

/**
 * Projects the state distribution forward, always starting everyone in the
 * input state chosen up in "Simulate a cohort" — asking for a starting state
 * a second time here would just duplicate that choice.
 */
export function ForecastPanel({ chain, matrix }: ForecastPanelProps) {
  const [steps, setSteps] = useState(8)

  const startId = chain.inputStateId ?? chain.states[0]?.id
  const startName = chain.states.find((s) => s.id === startId)?.name

  const start = useMemo(
    () => chain.states.map((s) => (s.id === startId ? 1 : 0)),
    [chain.states, startId],
  )

  const final = useMemo(() => {
    if (chain.states.length === 0) return null
    const distributions = nStepForecast(matrix, start, steps)
    return distributions[distributions.length - 1]
  }, [matrix, start, steps, chain.states.length])

  return (
    <div className="panel" data-tool-anchor="forecast">
      <h3>Forecast</h3>
      {startName && (
        <p className="panel-note">
          Starting everyone in <strong>{startName}</strong>
          {chain.inputStateId ? '' : ' (no input state chosen above yet)'},
          where would they be N weeks later?
        </p>
      )}
      <label className="field">
        steps (e.g. weeks): {steps}{' '}
        <input
          type="range"
          min={1}
          max={52}
          value={steps}
          onChange={(e) => setSteps(Number(e.target.value))}
        />
      </label>
      {final && (
        <DistributionBars
          items={chain.states.map((s, i) => ({
            id: s.id,
            name: s.name,
            value: final[i],
          }))}
        />
      )}
    </div>
  )
}
