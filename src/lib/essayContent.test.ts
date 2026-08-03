import { describe, expect, it } from 'vitest'
import { loadMeta, loadSections } from './essayContent'

describe('essay content', () => {
  const sections = loadSections()

  it('loads at least one section, sorted by order', () => {
    expect(sections.length).toBeGreaterThan(0)
    const orders = sections.map((s) => s.order)
    expect(orders).toEqual([...orders].sort((a, b) => a - b))
  })

  it('orders are unique finite numbers', () => {
    const orders = sections.map((s) => s.order)
    expect(new Set(orders).size).toBe(orders.length)
    for (const o of orders) expect(Number.isFinite(o)).toBe(true)
  })

  it('ids are unique and url-safe', () => {
    const ids = sections.map((s) => s.id).filter(Boolean) as string[]
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[a-z][a-z0-9-]*$/)
  })

  it('every section with a sidebar label has an anchor id', () => {
    for (const s of sections) {
      if (s.label) expect(s.id, `section order ${s.order} has label but no id`).toBeTruthy()
    }
  })

  it('bodies are non-empty prose', () => {
    for (const s of sections) expect(s.body.trim().length, `order ${s.order}`).toBeGreaterThan(40)
  })

  it('meta has eyebrow, title, and subtitle body', () => {
    const meta = loadMeta()
    expect(meta.eyebrow).toBeTruthy()
    expect(meta.title).toBeTruthy()
    expect(meta.subtitle.trim().length).toBeGreaterThan(40)
  })
})
