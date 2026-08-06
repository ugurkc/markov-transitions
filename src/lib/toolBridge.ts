/**
 * The essay ↔ tool bridge, DOM side. The whole contract is DOM-level on
 * purpose — no context, no refs threaded through the tree — which keeps the
 * pattern portable to any future essay with a companion tool panel:
 *
 * - Tool panels opt in by putting `data-tool-anchor="<name>"` on their root.
 * - `focusToolPanel(name)` scrolls that panel into view and pulses a
 *   highlight on it (see the `.tool-flash` styles in index.css).
 * - Links that should change the tool rather than just point at it go
 *   through a CustomEvent: the prose side fires `requestPreset(id)`, and the
 *   component that owns preset loading subscribes via `onPresetRequest`.
 *
 * The prose side of the contract is the `#tool:` markdown link scheme —
 * see EssayLink in App.tsx and ToolLink.tsx.
 */

const FLASH_CLASS = 'tool-flash'
const FLASH_MS = 1600

// The canvas is the React Flow graph itself — its edges/arrowheads render
// right up against the panel's own border, so the highlight ring visually
// collided with them. Every other panel is a plain padded rectangle where
// the ring reads cleanly, so only the canvas opts out.
const NO_FLASH_ANCHORS = new Set(['canvas'])

export function focusToolPanel(anchor: string) {
  const el = document.querySelector<HTMLElement>(
    `[data-tool-anchor="${anchor}"]`,
  )
  if (!el) return
  const reduceMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches
  el.scrollIntoView({
    behavior: reduceMotion ? 'auto' : 'smooth',
    block: 'nearest',
  })
  if (NO_FLASH_ANCHORS.has(anchor)) return
  // Restarting the animation needs the class to actually leave the DOM for
  // a frame, hence remove → reflow → re-add.
  el.classList.remove(FLASH_CLASS)
  void el.offsetWidth
  el.classList.add(FLASH_CLASS)
  window.setTimeout(() => el.classList.remove(FLASH_CLASS), FLASH_MS)
}

const LOAD_PRESET_EVENT = 'watershed:load-preset'

/** Ask whoever owns preset loading to switch presets. */
export function requestPreset(id: string) {
  window.dispatchEvent(new CustomEvent(LOAD_PRESET_EVENT, { detail: id }))
}

/** Subscribe to preset requests; returns the unsubscribe. */
export function onPresetRequest(handler: (id: string) => void): () => void {
  const listener = (e: Event) => handler((e as CustomEvent<string>).detail)
  window.addEventListener(LOAD_PRESET_EVENT, listener)
  return () => window.removeEventListener(LOAD_PRESET_EVENT, listener)
}

const LOAD_SCENARIO_EVENT = 'watershed:load-scenario'

/**
 * Ask the tool to load a before/after scenario (see lib/scenarios.ts). One
 * event, several subscribers: the canvas swaps the chain, the simulation
 * applies starting counts, the forecast panel jumps to infinity when asked --
 * each component picks up only the part of the scenario it owns.
 */
export function requestScenario(id: string) {
  window.dispatchEvent(new CustomEvent(LOAD_SCENARIO_EVENT, { detail: id }))
}

/** Subscribe to scenario requests; returns the unsubscribe. */
export function onScenarioRequest(handler: (id: string) => void): () => void {
  const listener = (e: Event) => handler((e as CustomEvent<string>).detail)
  window.addEventListener(LOAD_SCENARIO_EVENT, listener)
  return () => window.removeEventListener(LOAD_SCENARIO_EVENT, listener)
}
