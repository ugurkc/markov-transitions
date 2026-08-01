import { useMemo, useState } from 'react'
import type { Chain } from '../../lib/types'
import { diagnostics } from '../../lib/analysis'
import { formatPct } from './format'

export const STICKY_THRESHOLD = 0.7
export const LEAKY_THRESHOLD = 0.3

export function DiagnosticsPanel({ chain }: { chain: Chain }) {
  // undefined = "no explicit choice yet" → fall back to the default; null = "None".
  const [riskChoice, setRiskChoice] = useState<string | null | undefined>(undefined)

  const defaultRiskId = useMemo(
    () => chain.states.find((s) => /churn/i.test(s.name))?.id ?? null,
    [chain.states],
  )
  const stateIds = useMemo(() => new Set(chain.states.map((s) => s.id)), [chain.states])
  const riskStateId =
    riskChoice !== undefined && (riskChoice === null || stateIds.has(riskChoice))
      ? riskChoice
      : defaultRiskId

  const rows = useMemo(() => diagnostics(chain, riskStateId), [chain, riskStateId])
  const names = useMemo(
    () => new Map(chain.states.map((s) => [s.id, s.name])),
    [chain.states],
  )

  return (
    <div className="panel">
      <h3>Diagnostics</h3>
      <label className="field">
        Risk state{' '}
        <select
          value={riskStateId ?? ''}
          onChange={(e) => setRiskChoice(e.target.value === '' ? null : e.target.value)}
        >
          <option value="">None</option>
          {chain.states.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </label>
      <table className="data-table">
        <thead>
          <tr>
            <th>State</th>
            <th>Stickiness</th>
            <th>Top outbound</th>
            <th>Drop-off &rarr; risk</th>
            <th>Flag</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const flags: string[] = []
            if (row.stickiness >= STICKY_THRESHOLD) flags.push('sticky')
            if (row.dropOff !== null && row.dropOff >= LEAKY_THRESHOLD) flags.push('leaky')
            return (
              <tr key={row.stateId}>
                <td>{names.get(row.stateId)}</td>
                <td>{formatPct(row.stickiness)}</td>
                <td>
                  {row.topOutbound
                    ? `→ ${names.get(row.topOutbound.toId)} ${formatPct(row.topOutbound.probability)}`
                    : '—'}
                </td>
                <td>{row.dropOff !== null ? formatPct(row.dropOff) : '—'}</td>
                <td>{flags.length > 0 ? flags.join(', ') : ''}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
