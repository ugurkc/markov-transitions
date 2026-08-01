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
        This chain has no absorbing states, so probability keeps circulating — in
        the long run it settles into a stationary mix, regardless of where players
        start.
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
