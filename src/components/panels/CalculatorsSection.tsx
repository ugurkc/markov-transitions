import { useMemo } from 'react'
import type { Chain } from '../../lib/types'
import { buildMatrix, validateChain } from '../../lib/chain'
import { ValidationBanner } from './ValidationBanner'
import { ForecastPanel } from './ForecastPanel'
import { SteadyStatePanel } from './SteadyStatePanel'

export function CalculatorsSection({ chain }: { chain: Chain }) {
  const validation = useMemo(() => validateChain(chain), [chain])
  const matrix = useMemo(() => buildMatrix(chain), [chain])
  const showCalculators = validation.valid && chain.states.length > 0

  return (
    <section className="calculators">
      <ValidationBanner chain={chain} validation={validation} />
      {showCalculators && (
        <>
          <ForecastPanel chain={chain} matrix={matrix} />
          <SteadyStatePanel chain={chain} matrix={matrix} />
        </>
      )}
    </section>
  )
}
