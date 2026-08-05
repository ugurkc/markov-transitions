import type { ReactNode } from 'react'
import { focusToolPanel } from '../lib/toolBridge'

interface ToolLinkProps {
  /** Matches a `data-tool-anchor` attribute on a tool panel's root. */
  anchor: string
  /**
   * Runs before the scroll-and-flash — for links that change the tool
   * (e.g. load a preset) rather than just point at it. The focus happens
   * two frames later so React has committed whatever the action changed.
   */
  onBeforeFocus?: () => void
  children: ReactNode
}

/**
 * An inline prose link into the tool sidebar: clicking it scrolls the
 * matching `data-tool-anchor` panel into view and pulses a highlight on it.
 * See lib/toolBridge.ts for the full essay ↔ tool contract.
 */
export function ToolLink({ anchor, onBeforeFocus, children }: ToolLinkProps) {
  return (
    <button
      type="button"
      className="tool-link"
      onClick={() => {
        onBeforeFocus?.()
        requestAnimationFrame(() =>
          requestAnimationFrame(() => focusToolPanel(anchor)),
        )
      }}
    >
      {children}
      <svg
        className="tool-link-icon"
        viewBox="0 0 12 12"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="6" cy="6" r="4.25" fill="none" strokeWidth="1.5" />
        <circle cx="6" cy="6" r="1.5" />
      </svg>
      <span className="sr-only"> (show in the tool panel)</span>
    </button>
  )
}
