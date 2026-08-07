/**
 * Which instrument belongs beside which part of the essay.
 *
 * The tool is a stage, not a pile: the graph is always on it, and exactly one
 * panel sits below, chosen by whatever section the reader is currently in.
 * Stacking all five at once meant every one of them was too small to use --
 * the matrix in particular -- and the panel a sentence referred to was
 * usually a thousand pixels below the fold.
 *
 * Readers can still pick a panel by hand, and prose links and before/after
 * chips override the choice for as long as you stay in that section.
 */
export type PanelKey = 'matrix' | 'simulate' | 'retention' | 'forecast'

export const PANEL_ORDER: PanelKey[] = ['matrix', 'simulate', 'retention', 'forecast']

export const PANEL_LABELS: Record<PanelKey, string> = {
  matrix: 'Matrix',
  simulate: 'Simulate',
  retention: 'Retention',
  forecast: 'Forecast',
}

export function isPanelKey(value: string): value is PanelKey {
  return (PANEL_ORDER as string[]).includes(value)
}

/**
 * Section id -> the panel that section is actually about. Keys are the `id`
 * frontmatter of the essay's sections, plus `intro` for the article header;
 * a test cross-checks them against the real content files so a renamed
 * section can't silently fall back to the default.
 */
export const SECTION_PANEL: Record<string, PanelKey> = {
  intro: 'simulate',
  opening: 'simulate',
  'states-and-transitions': 'matrix',
  'sample-questions': 'retention',
  'transition-matrix': 'matrix',
  'real-world-modeling': 'retention',
  'try-it': 'simulate',
  caveats: 'forecast',
}

export const DEFAULT_PANEL: PanelKey = 'simulate'

export function panelForSection(sectionId: string): PanelKey {
  return SECTION_PANEL[sectionId] ?? DEFAULT_PANEL
}
