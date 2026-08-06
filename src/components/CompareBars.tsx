import { useMemo } from 'react'
import { formatCompareValue, parseCompare } from '../lib/compare'
import type { CompareSpec } from '../lib/compare'

/**
 * The essay's inline before/after bar graphic, rendered from a ```compare
 * fence (format in lib/compare.ts). Follows the "emphasis" chart form: the
 * bar the story is about (marked `*` in the fence) wears the accent color at
 * full strength, the rest sit back as context. Values ride each bar's tip in
 * ink, labels stay in muted text — the marks carry color, the text never
 * does. Both themes come free from the site's tokens.
 *
 * CI parses every fence in the content files, so this component only ever
 * sees sources that parse; the null fallback is belt-and-braces for a CMS
 * draft previewed before CI has seen it.
 */
export function CompareBars({ source }: { source: string }) {
  const spec = useMemo<CompareSpec | null>(() => {
    try {
      return parseCompare(source)
    } catch {
      return null
    }
  }, [source])

  if (!spec) return null
  const max = Math.max(...spec.rows.map((r) => r.value), 1e-9)

  return (
    <div className="compare-bars">
      {spec.rows.map((row) => (
        <div className="compare-row" key={row.label}>
          <span className="compare-label">{row.label}</span>
          <div className="compare-track">
            <div
              className={`compare-fill${row.emphasis ? ' emphasis' : ''}`}
              style={{ width: `${(row.value / max) * 100}%` }}
            />
            <span className="compare-value">
              {formatCompareValue(row.raw, spec.unit)}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
