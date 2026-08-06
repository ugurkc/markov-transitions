import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PANEL,
  PANEL_LABELS,
  PANEL_ORDER,
  SECTION_PANEL,
  isPanelKey,
  panelForSection,
} from './stagePanels'
import { loadSections } from './essayContent'

describe('stage panels', () => {
  it('every panel is ordered and labelled exactly once', () => {
    expect(new Set(PANEL_ORDER).size).toBe(PANEL_ORDER.length)
    for (const key of PANEL_ORDER) expect(PANEL_LABELS[key]).toBeTruthy()
    expect(Object.keys(PANEL_LABELS).sort()).toEqual([...PANEL_ORDER].sort())
  })

  it('panel keys match the anchors components actually declare', () => {
    const sources = Object.values(
      import.meta.glob('../components/**/*.tsx', {
        eager: true,
        query: '?raw',
        import: 'default',
      }) as Record<string, string>,
    )
    const anchors = new Set(
      sources.flatMap((src) =>
        [...src.matchAll(/data-tool-anchor="([^"]+)"/g)].map((m) => m[1]),
      ),
    )
    for (const key of PANEL_ORDER) expect(anchors, key).toContain(key)
  })

  // The stage picks a panel from the section id. A renamed or dropped section
  // would silently fall back to the default instead of showing the instrument
  // that section is about, so every mapped id has to be a real one.
  it('every mapped section id exists in the essay', () => {
    const real = new Set(['intro', ...loadSections().map((s) => s.id).filter(Boolean)])
    for (const id of Object.keys(SECTION_PANEL)) {
      expect(real, `SECTION_PANEL has "${id}"`).toContain(id)
    }
  })

  it('every essay section maps to a panel, none left to the fallback', () => {
    for (const s of loadSections()) {
      if (!s.id) continue
      expect(SECTION_PANEL[s.id], `section "${s.id}" is unmapped`).toBeTruthy()
    }
  })

  it('every mapped panel is a real panel', () => {
    for (const [id, key] of Object.entries(SECTION_PANEL)) {
      expect(isPanelKey(key), `${id} -> ${key}`).toBe(true)
    }
  })

  it('falls back for an unknown section', () => {
    expect(panelForSection('nope')).toBe(DEFAULT_PANEL)
    expect(isPanelKey(DEFAULT_PANEL)).toBe(true)
  })

  it('rejects things that are not panel keys', () => {
    expect(isPanelKey('canvas')).toBe(false)
    expect(isPanelKey('')).toBe(false)
  })
})
