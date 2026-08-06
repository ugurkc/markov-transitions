import type { Chain } from '../../lib/types'
import type { ValidationResult } from '../../lib/chain'

interface ValidationBannerProps {
  chain: Chain
  validation: ValidationResult
}

export function ValidationBanner({ chain, validation }: ValidationBannerProps) {
  if (chain.states.length === 0) {
    return (
      <div className="panel hint">
        Double-click the canvas to add your first state, or load a preset.
      </div>
    )
  }
  if (validation.valid) return null
  const names = new Map(chain.states.map((s) => [s.id, s.name]))
  return (
    <div className="banner-error" role="alert">
      <p>
        Calculations are paused. These states&apos; outgoing probabilities
        don&apos;t sum to 1:
      </p>
      <div className="chip-row">
        {validation.invalidStateIds.map((id) => (
          <span className="chip" key={id}>
            {names.get(id) ?? id} (&Sigma; = {(validation.rowSums[id] ?? 0).toFixed(3)})
          </span>
        ))}
      </div>
    </div>
  )
}
