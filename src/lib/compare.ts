/**
 * Parser for the essay's ```compare fences: a tiny declarative format for the
 * inline before/after bar graphics that sit next to each sample question.
 *
 *   ```compare
 *   unit: weeks
 *   Baseline: 6.0
 *   Cut early churn: 7.3 *
 *   ```
 *
 * One `Label: value` per line; a trailing `*` marks the bar the story is
 * about (drawn in the accent color, the rest de-emphasized -- the "emphasis"
 * chart form). An optional `unit:` line is appended to each value label.
 * CI parses every fence in the content files, so a CMS typo fails the build
 * instead of rendering a broken graphic.
 */
export interface CompareRow {
  label: string
  value: number
  /** The value exactly as written, so the essay controls display precision. */
  raw: string
  emphasis: boolean
}

export interface CompareSpec {
  unit: string
  rows: CompareRow[]
}

export function parseCompare(source: string): CompareSpec {
  const lines = source
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  let unit = ''
  const rows: CompareRow[] = []
  for (const line of lines) {
    const unitMatch = line.match(/^unit:\s*(.*)$/)
    if (unitMatch) {
      unit = unitMatch[1].trim()
      continue
    }
    const rowMatch = line.match(/^(.+?):\s*([0-9]+(?:\.[0-9]+)?)\s*(\*)?$/)
    if (!rowMatch) throw new Error(`compare: cannot parse line "${line}"`)
    rows.push({
      label: rowMatch[1].trim(),
      raw: rowMatch[2],
      value: Number(rowMatch[2]),
      emphasis: rowMatch[3] === '*',
    })
  }
  if (rows.length < 2) throw new Error('compare: needs at least two rows to compare')
  return { unit, rows }
}

/** "7.3 weeks", "37.0%" -- percent hugs the number, word units get a space. */
export function formatCompareValue(raw: string, unit: string): string {
  if (!unit) return raw
  return unit === '%' ? `${raw}%` : `${raw} ${unit}`
}
