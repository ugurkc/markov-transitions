import { useEffect, useMemo, useState } from 'react'
import type { Chain } from '../../lib/types'
import type { Matrix } from '../../lib/linalg'
import { forecastOscillates, longRunDistribution, nStepForecast } from '../../lib/analysis'
import { getScenario } from '../../lib/scenarios'
import { onScenarioRequest } from '../../lib/toolBridge'
import { DistributionBars } from './DistributionBars'

interface ForecastPanelProps {
  chain: Chain
  matrix: Matrix
}

const MAX_WEEKS = 52
/** One notch past the last week: the slider's "run it forever" stop. */
const FOREVER = MAX_WEEKS + 1

/**
 * Projects the state distribution forward, always starting everyone in the
 * input state chosen up in "Simulate a cohort" — asking for a starting state
 * a second time here would just duplicate that choice.
 *
 * The last notch is infinity, which is where the steady state lives. Every
 * preset here converges well before week 52, so a separate steady-state panel
 * was printing the same numbers a second time; folding it into this slider
 * turns "the long run" from a different calculation into the same one, run
 * further. See `longRunDistribution` for why infinity is computed rather than
 * approximated with a very large step count.
 */
export function ForecastPanel({ chain, matrix }: ForecastPanelProps) {
  const [steps, setSteps] = useState(8)
  const forever = steps >= FOREVER

  // Before/after chips that argue about the long run (see lib/scenarios.ts)
  // jump the slider straight to infinity, so the reader lands on the number
  // the prose is quoting instead of a week-8 snapshot.
  useEffect(
    () =>
      onScenarioRequest((id) => {
        if (getScenario(id)?.forecastToForever) setSteps(FOREVER)
      }),
    [],
  )

  const startId = chain.inputStateId ?? chain.states[0]?.id
  const startName = chain.states.find((s) => s.id === startId)?.name

  const start = useMemo(
    () => chain.states.map((s) => (s.id === startId ? 1 : 0)),
    [chain.states, startId],
  )

  const final = useMemo(() => {
    if (chain.states.length === 0) return null
    if (forever) return longRunDistribution(matrix, start).distribution
    const distributions = nStepForecast(matrix, start, steps)
    return distributions[distributions.length - 1]
  }, [matrix, start, steps, forever, chain.states.length])

  // Only worth explaining once you're actually looking at the infinite case:
  // a cycling chain has no destination, so that figure means something else.
  const oscillates = useMemo(
    () => forever && chain.states.length > 0 && forecastOscillates(matrix, start),
    [forever, matrix, start, chain.states.length],
  )

  return (
    <div className="panel" data-tool-anchor="forecast">
      <h3>Forecast</h3>
      {startName && (
        <p className="panel-note">
          Starting everyone in <strong>{startName}</strong>
          {chain.inputStateId ? '' : ' (no input state chosen above yet)'},
          where would they be N weeks later? Drag all the way right to run it
          forever and see where the mix finally settles.
        </p>
      )}
      <label className="field">
        steps (e.g. weeks): {forever ? '∞' : steps}{' '}
        <input
          type="range"
          min={1}
          max={FOREVER}
          value={steps}
          aria-valuetext={forever ? 'forever' : `${steps} steps`}
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
      {oscillates && (
        <p className="hint">
          This chain cycles rather than settling, so there is no single
          destination. The numbers above are the share of time players spend
          in each state over the long run.
        </p>
      )}
    </div>
  )
}
