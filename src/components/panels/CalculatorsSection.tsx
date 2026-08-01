import { useMemo } from 'react'
import type { Chain } from '../../lib/types'
import { absorbingStateIds, buildMatrix, validateChain } from '../../lib/chain'
import { ValidationBanner } from './ValidationBanner'
import { DiagnosticsPanel } from './DiagnosticsPanel'
import { ForecastPanel } from './ForecastPanel'
import { AbsorptionPanel } from './AbsorptionPanel'
import { SteadyStatePanel } from './SteadyStatePanel'

export function CalculatorsSection({ chain }: { chain: Chain }) {
  const validation = useMemo(() => validateChain(chain), [chain])
  const absorbingIds = useMemo(() => absorbingStateIds(chain), [chain])
  const matrix = useMemo(() => buildMatrix(chain), [chain])
  const showCalculators = validation.valid && chain.states.length > 0

  return (
    <section className="calculators">
      <ValidationBanner chain={chain} validation={validation} />
      {showCalculators && (
        <>
          <DiagnosticsPanel chain={chain} />
          <ForecastPanel chain={chain} matrix={matrix} />
          {absorbingIds.length > 0 ? (
            <AbsorptionPanel chain={chain} matrix={matrix} absorbingIds={absorbingIds} />
          ) : (
            <SteadyStatePanel chain={chain} matrix={matrix} />
          )}
        </>
      )}
    </section>
  )
}
