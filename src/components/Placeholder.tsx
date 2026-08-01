interface PlaceholderProps {
  /** Anchor id for the section (used by the sidebar TOC). */
  id?: string
  /** Optional section heading, rendered as a real <h2>. */
  heading?: string
  /** Guidance for the site owner about what to write in this section. */
  hint: string
}

/**
 * Stand-in for article prose that has not been written yet. Renders the
 * suggested heading as a real <h2> (so the document outline is already
 * correct) and the hint as a visually distinct dashed block, so the owner
 * can tell at a glance what to write where.
 */
export function Placeholder({ id, heading, hint }: PlaceholderProps) {
  return (
    <section id={id}>
      {heading && <h2>{heading}</h2>}
      <p className="placeholder">{hint}</p>
    </section>
  )
}
