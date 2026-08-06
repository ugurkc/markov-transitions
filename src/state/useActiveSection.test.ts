import { describe, expect, it } from 'vitest'
import { pickActiveSection } from './useActiveSection'
import { panelForSection } from '../lib/stagePanels'

// Real geometry, captured from the running page at a 900px viewport with the
// reader at the top: these are the section tops the stage actually sees.
const PAGE_TOP = [
  { id: 'intro', top: 56 },
  { id: 'opening', top: 359 },
  { id: 'states-and-transitions', top: 997 },
  { id: 'sample-questions', top: 1484 },
  { id: 'transition-matrix', top: 3008 },
  { id: 'try-it', top: 3611 },
  { id: 'caveats', top: 4029 },
]
const LINE = 315

/** The same page scrolled down by `y`. */
const scrolledBy = (y: number) => PAGE_TOP.map((s) => ({ ...s, top: s.top - y }))

describe('pickActiveSection', () => {
  it('is the first section before anything has crossed the line', () => {
    expect(pickActiveSection(scrolledBy(0), LINE)).toBe('intro')
  })

  it('follows the reader down the page', () => {
    // Each scroll offset puts a different section's top just above the line.
    expect(pickActiveSection(scrolledBy(100), LINE)).toBe('opening')
    expect(pickActiveSection(scrolledBy(800), LINE)).toBe('states-and-transitions')
    expect(pickActiveSection(scrolledBy(1300), LINE)).toBe('sample-questions')
    expect(pickActiveSection(scrolledBy(2800), LINE)).toBe('transition-matrix')
    expect(pickActiveSection(scrolledBy(3400), LINE)).toBe('try-it')
    expect(pickActiveSection(scrolledBy(3800), LINE)).toBe('caveats')
  })

  it('never goes backwards as the reader scrolls forward', () => {
    const seen: string[] = []
    for (let y = 0; y <= 4200; y += 50) {
      const id = pickActiveSection(scrolledBy(y), LINE)
      if (seen[seen.length - 1] !== id) seen.push(id)
    }
    expect(seen).toEqual([
      'intro',
      'opening',
      'states-and-transitions',
      'sample-questions',
      'transition-matrix',
      'try-it',
      'caveats',
    ])
  })

  // The whole point of the stage: reading a section puts its instrument up.
  it('drives the panel the essay is actually talking about', () => {
    const panelAt = (y: number) => panelForSection(pickActiveSection(scrolledBy(y), LINE))
    expect(panelAt(800)).toBe('matrix')
    expect(panelAt(1300)).toBe('retention')
    expect(panelAt(2800)).toBe('matrix')
    expect(panelAt(3400)).toBe('simulate')
    expect(panelAt(3800)).toBe('forecast')
  })

  it('handles an empty list and a section exactly on the line', () => {
    expect(pickActiveSection([], LINE)).toBe('')
    expect(pickActiveSection([{ id: 'a', top: LINE }], LINE)).toBe('a')
  })
})
