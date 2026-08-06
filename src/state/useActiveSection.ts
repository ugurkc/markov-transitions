import { useEffect, useState } from 'react'

/** Where down the viewport the "you are reading here" line sits. */
export const READING_LINE = 0.35

/**
 * The last section whose top has passed the reading line, or the first one
 * when none has (the reader is still above the fold).
 *
 * Split out from the hook so the choice itself is testable without a
 * viewport: this is the part that decides which instrument the essay shows.
 * `tops` must be in document order.
 */
export function pickActiveSection(
  tops: Array<{ id: string; top: number }>,
  line: number,
): string {
  let current = tops[0]?.id ?? ''
  for (const { id, top } of tops) {
    if (top <= line) current = id
  }
  return current
}

/**
 * Which of `ids` the reader is currently in: the last one whose top has
 * passed a line about a third down the viewport.
 *
 * Deliberately a scroll listener rather than an IntersectionObserver. The
 * question here is "which section is the reader in", which has an answer at
 * every scroll position; an observer only fires when a threshold is crossed,
 * so a slow scroll through one long section reports nothing at all. Reads are
 * throttled to one per frame and only touch a handful of elements.
 *
 * `ids` must be referentially stable — pass a module constant, not an inline
 * array, or the effect resubscribes on every render.
 */
export function useActiveSection(ids: string[]): string {
  const [active, setActive] = useState(ids[0] ?? '')

  useEffect(() => {
    if (ids.length === 0) return
    let frame = 0

    const update = () => {
      frame = 0
      const tops = ids
        .map((id) => ({ id, el: document.getElementById(id) }))
        .filter((e): e is { id: string; el: HTMLElement } => e.el !== null)
        .map(({ id, el }) => ({ id, top: el.getBoundingClientRect().top }))
      const current = pickActiveSection(tops, window.innerHeight * READING_LINE)
      if (current) setActive((prev) => (prev === current ? prev : current))
    }

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [ids])

  return active
}
