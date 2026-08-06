import { useMemo } from 'react'
import type { Chain } from '../../lib/types'
import type { Matrix } from '../../lib/linalg'
import { absorbingStateIds, closedClasses } from '../../lib/chain'
import { steadyState } from '../../lib/analysis'
import { DistributionBars } from './DistributionBars'

export function SteadyStatePanel({ chain, matrix }: { chain: Chain; matrix: Matrix }) {
  const classes = useMemo(() => closedClasses(chain), [chain])
  const multipleClosed = classes.length > 1

  // Named from the live chain, never hardcoded: only one of the presets has a
  // state called "Churned", and in the win-back loop that state isn't
  // absorbing at all.
  const absorbingName = useMemo(() => {
    const [first] = absorbingStateIds(chain)
    return first ? chain.states.find((s) => s.id === first)?.name : undefined
  }, [chain])

  const result = useMemo(() => {
    if (multipleClosed || matrix.length === 0) return null
    return steadyState(matrix)
  }, [matrix, multipleClosed])

  return (
    <div className="panel" data-tool-anchor="steady-state">
      <h3>Steady state</h3>
      <p className="panel-note">
        Run this chain forward forever: what fraction of players end up in each
        state, no matter where they started?{' '}
        {absorbingName ? (
          <>
            Because <strong>{absorbingName}</strong> is a one-way door, that
            number trends toward 100% there: everyone gets there eventually,
            it&rsquo;s just a question of when.
          </>
        ) : (
          <>
            This chain has no one-way doors, so nobody is stuck anywhere:
            players keep cycling and the mix settles into a stable balance
            instead.
          </>
        )}
      </p>
      {multipleClosed ? (
        <p className="inline-warning">
          This chain has multiple closed groups, so the long-run mix depends
          on where players start: no single steady state exists.
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
