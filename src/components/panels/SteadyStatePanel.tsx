import { useMemo } from 'react'
import type { Chain } from '../../lib/types'
import type { Matrix } from '../../lib/linalg'
import { closedClasses } from '../../lib/chain'
import { steadyState } from '../../lib/analysis'
import { DistributionBars } from './DistributionBars'

export function SteadyStatePanel({ chain, matrix }: { chain: Chain; matrix: Matrix }) {
  const classes = useMemo(() => closedClasses(chain), [chain])
  const multipleClosed = classes.length > 1

  const result = useMemo(() => {
    if (multipleClosed || matrix.length === 0) return null
    return steadyState(matrix)
  }, [matrix, multipleClosed])

  return (
    <div className="panel">
      <h3>Steady state</h3>
      <p className="panel-note">
        Run this chain forward forever: what fraction of players end up in each
        state, no matter where they started? For a chain with an absorbing
        state like Churned, that number trends toward 100% there &mdash;
        everyone gets there eventually, it&rsquo;s just a question of when.
      </p>
      {multipleClosed ? (
        <p className="inline-warning">
          This chain has multiple closed groups — the long-run mix depends on
          where players start, so no single steady state exists.
        </p>
      ) : result === null ? null : !result.converged ? (
        <p className="inline-warning">Did not converge.</p>
      ) : (
        <DistributionBars
          items={chain.states.map((s, i) => ({
            id: s.id,
            name: s.name,
            value: result.distribution[i],
          }))}
        />
      )}
    </div>
  )
}
