import { useEffect, useState } from 'react'

export interface SidebarSection {
  id: string
  label: string
}

interface SidebarProps {
  sections: SidebarSection[]
}

/** Viewport line (px from top) a section must cross to count as "current". */
const ACTIVE_LINE = 120

/**
 * Sticky "On this page" table of contents. Highlights the last section whose
 * top has scrolled past the active line (with a bottom-of-page fallback so
 * the final section is reachable); hidden on narrow screens (CSS).
 */
export function Sidebar({ sections }: SidebarProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    const onScroll = () => {
      let current = sections[0]?.id ?? null
      for (const s of sections) {
        const el = document.getElementById(s.id)
        if (el && el.getBoundingClientRect().top <= ACTIVE_LINE) current = s.id
      }
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 4
      if (atBottom && sections.length > 0) {
        current = sections[sections.length - 1].id
      }
      setActiveId(current)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [sections])

  return (
    <aside className="sidebar">
      <nav aria-label="On this page">
        <p className="sidebar-title">On this page</p>
        <ul>
          {sections.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className={activeId === s.id ? 'active' : undefined}
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
