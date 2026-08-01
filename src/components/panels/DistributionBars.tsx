import { formatPct } from './format'

export interface DistributionItem {
  id: string
  name: string
  /** Probability in [0, 1]. */
  value: number
}

/**
 * Horizontal bars for a probability distribution. Single accent color
 * (identity is carried by the row label, not by hue); values as text so
 * the numbers are never color-gated.
 */
export function DistributionBars({ items }: { items: DistributionItem[] }) {
  return (
    <div className="dist-bars">
      {items.map((item) => (
        <div className="dist-row" key={item.id}>
          <span className="dist-label">{item.name}</span>
          <div className="dist-track">
            <div
              className="dist-fill"
              style={{ width: `${Math.max(0, Math.min(1, item.value)) * 100}%` }}
            />
          </div>
          <span className="dist-value">{formatPct(item.value)}</span>
        </div>
      ))}
    </div>
  )
}
