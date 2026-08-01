import { useMemo, useState } from 'react'
import type { Chain } from '../../lib/types'
import type { Matrix, Vector } from '../../lib/linalg'
import { PROB_TOLERANCE } from '../../lib/chain'
import { nStepForecast } from '../../lib/analysis'
import { DistributionBars } from './DistributionBars'

const CUSTOM = '__custom__'

interface ForecastPanelProps {
  chain: Chain
  matrix: Matrix
}

export function ForecastPanel({ chain, matrix }: ForecastPanelProps) {
  const [startChoice, setStartChoice] = useState<string | undefined>(undefined)
  const [steps, setSteps] = useState(8)
  const [mixInputs, setMixInputs] = useState<Record<string, string>>({})

  const stateIds = useMemo(() => new Set(chain.states.map((s) => s.id)), [chain.states])
  const startId =
    startChoice !== undefined && (startChoice === CUSTOM || stateIds.has(startChoice))
      ? startChoice
      : chain.states[0]?.id
  const isCustom = startId === CUSTOM

  const selectStart = (value: string) => {
    if (value === CUSTOM && startId !== CUSTOM && startId !== undefined) {
      // Seed the custom mix with the currently selected single-state start.
      setMixInputs(
        Object.fromEntries(chain.states.map((s) => [s.id, s.id === startId ? '1' : '0'])),
      )
    }
    setStartChoice(value)
  }

  // Either a valid start vector or the warning explaining why there is none.
  const startResult = useMemo<
    { vector: Vector; warning?: undefined } | { vector?: undefined; warning: string }
  >(() => {
    if (!isCustom) {
      return { vector: chain.states.map((s) => (s.id === startId ? 1 : 0)) }
    }
    const values = chain.states.map((s) => Number(mixInputs[s.id] ?? '0'))
    if (
      values.some(
        (v) => !Number.isFinite(v) || v < -PROB_TOLERANCE || v > 1 + PROB_TOLERANCE,
      )
    ) {
      return { warning: 'Each custom mix entry must be a number between 0 and 1.' }
    }
    const sum = values.reduce((a, v) => a + v, 0)
    if (Math.abs(sum - 1) > PROB_TOLERANCE) {
      return {
        warning: `The custom mix must sum to 1 (currently Σ = ${sum.toFixed(3)}).`,
      }
    }
    return { vector: values }
  }, [chain.states, startId, isCustom, mixInputs])
  const start = startResult.vector ?? null

  const final = useMemo(() => {
    if (!start || chain.states.length === 0) return null
    const distributions = nStepForecast(matrix, start, steps)
    return distributions[distributions.length - 1]
  }, [matrix, start, steps, chain.states.length])

  return (
    <div className="panel">
      <h3>Forecast</h3>
      <label className="field">
        Start{' '}
        <select value={startId ?? ''} onChange={(e) => selectStart(e.target.value)}>
          {chain.states.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
          <option value={CUSTOM}>Custom mix…</option>
        </select>
      </label>
      {isCustom && (
        <div className="mix-inputs">
          {chain.states.map((s) => (
            <label className="field" key={s.id}>
              {s.name}{' '}
              <input
                type="number"
                min="0"
                max="1"
                step="0.05"
                value={mixInputs[s.id] ?? '0'}
                onChange={(e) =>
                  setMixInputs((prev) => ({ ...prev, [s.id]: e.target.value }))
                }
              />
            </label>
          ))}
          {startResult.warning !== undefined && (
            <p className="inline-warning">{startResult.warning}</p>
          )}
        </div>
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
