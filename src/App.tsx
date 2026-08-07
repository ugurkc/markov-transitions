import { isValidElement, memo, useEffect, useMemo, useRef, useState } from 'react'
import type { AnchorHTMLAttributes, HTMLAttributes } from 'react'
import Markdown from 'react-markdown'
import { ChainCanvas } from './components/ChainCanvas'
import { CompareBars } from './components/CompareBars'
import { MatrixPanel } from './components/MatrixPanel'
import { ScenarioChip, ToolLink } from './components/ToolLink'
import { RetentionChart } from './components/RetentionChart'
import { Sidebar } from './components/Sidebar'
import { SimulationPanel } from './components/SimulationPanel'
import { ThemeToggle } from './components/ThemeToggle'
import { ForecastPanel } from './components/panels/ForecastPanel'
import { ValidationBanner } from './components/panels/ValidationBanner'
import { buildMatrix, validateChain } from './lib/chain'
import { loadMeta, loadSections } from './lib/essayContent'
import {
  PANEL_LABELS,
  PANEL_ORDER,
  isPanelKey,
  panelForSection,
} from './lib/stagePanels'
import type { PanelKey } from './lib/stagePanels'
import { onPanelRequest, requestPreset } from './lib/toolBridge'
import { useActiveSection } from './state/useActiveSection'
import { useChain } from './state/useChain'
import { useSimulation } from './state/useSimulation'
import { useTheme } from './state/useTheme'

const REPO_URL = 'https://github.com/ugurkc/riverbed'

const META = loadMeta()
const ESSAY_SECTIONS = loadSections()
const SECTIONS = [
  { id: 'intro', label: 'Introduction' },
  ...ESSAY_SECTIONS.filter((s) => s.id && s.label).map((s) => ({ id: s.id!, label: s.label! })),
]

/**
 * Prose links into the tool sidebar. A markdown link whose href uses the
 * `#tool:` scheme renders as a ToolLink — clicking it scrolls the matching
 * `data-tool-anchor` panel into view and pulses a highlight on it:
 *
 *   [the transition matrix](#tool:matrix)
 *   [Win-back loop preset](#tool:canvas?preset=preset-winback)
 *
 * The optional `preset` param loads that preset first, so prose like
 * "switch to the win-back preset" actually performs the switch.
 *
 * A second scheme, `#scenario:<id>`, renders as a before/after example chip:
 * clicking loads that scenario (lib/scenarios.ts) into the tool and focuses
 * the panel where the difference shows up.
 */
function EssayLink({
  href,
  children,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement>) {
  if (href?.startsWith('#scenario:')) {
    return <ScenarioChip id={href.slice('#scenario:'.length)}>{children}</ScenarioChip>
  }
  if (href?.startsWith('#tool:')) {
    const [anchor, query] = href.slice('#tool:'.length).split('?')
    const preset = query ? new URLSearchParams(query).get('preset') : null
    return (
      <ToolLink
        anchor={anchor}
        onBeforeFocus={preset ? () => requestPreset(preset) : undefined}
      >
        {children}
      </ToolLink>
    )
  }
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  )
}

/**
 * ```compare fences render as the inline before/after bar graphic instead of
 * a code block — react-markdown wraps fenced code in pre > code, so the pre
 * mapping is where the swap happens (see lib/compare.ts for the format).
 */
function EssayPre(props: HTMLAttributes<HTMLPreElement>) {
  const child = props.children
  if (isValidElement(child)) {
    const { className, children } = child.props as {
      className?: string
      children?: unknown
    }
    if (typeof className === 'string' && className.includes('language-compare')) {
      return <CompareBars source={String(children ?? '')} />
    }
  }
  return <pre {...props} />
}

const MD_COMPONENTS = { a: EssayLink, pre: EssayPre }

/**
 * The essay's static prose (header + sections). META and ESSAY_SECTIONS are
 * module constants, so this takes no props; memo() makes React skip it when
 * App re-renders (~60fps during simulation playback and canvas drags), so the
 * markdown pipeline runs exactly once per page load.
 */
const ArticleBody = memo(function ArticleBody() {
  return (
    <>
      <header className="article-header" id="intro">
        <a className="home-link" href="https://ugurkc.github.io/">
          ← ugurkc.github.io
        </a>
        <p className="eyebrow">{META.eyebrow}</p>
        <h1>{META.title}</h1>
        <Markdown
          components={{
            ...MD_COMPONENTS,
            p: (props) => <p className="subtitle" {...props} />,
          }}
        >
          {META.subtitle}
        </Markdown>
      </header>

      {ESSAY_SECTIONS.map((s) => (
        <section key={s.order} id={s.id}>
          {s.heading && <h2>{s.heading}</h2>}
          <Markdown components={MD_COMPONENTS}>{s.body}</Markdown>
        </section>
      ))}
    </>
  )
})

/** Section ids the stage tracks, in document order. Stable by module scope. */
const TRACKED_SECTIONS = ['intro', ...ESSAY_SECTIONS.map((s) => s.id).filter(Boolean)] as string[]

function App() {
  const { chain, dispatch } = useChain()
  const [theme, setTheme] = useTheme()
  const sim = useSimulation(chain)

  const validation = useMemo(() => validateChain(chain), [chain])
  const matrix = useMemo(() => buildMatrix(chain), [chain])

  const activeSection = useActiveSection(TRACKED_SECTIONS)

  // A prose link or a before/after chip can pin a panel that isn't the one
  // this section would pick. That choice holds while the reader stays put and
  // is dropped as soon as they scroll into a different section, so the stage
  // goes back to following along rather than being stuck where a click left it.
  const [override, setOverride] = useState<{ panel: PanelKey; section: string } | null>(null)
  const sectionRef = useRef(activeSection)
  sectionRef.current = activeSection

  useEffect(
    () =>
      onPanelRequest((key) => {
        if (isPanelKey(key)) setOverride({ panel: key, section: sectionRef.current })
      }),
    [],
  )

  const panel =
    override && override.section === activeSection
      ? override.panel
      : panelForSection(activeSection)

  const selectPanel = (key: PanelKey) => setOverride({ panel: key, section: activeSection })

  return (
    <div className="page">
      <ThemeToggle
        theme={theme}
        onToggle={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      />
      <Sidebar sections={SECTIONS} />
      <main>
        <div className="content-layout">
          <article className="article">
            <ArticleBody />

            <footer className="article-footer">
              <a href={REPO_URL}>Source on GitHub</a>
            </footer>
          </article>

          {/* A stage, not a pile: the graph is always on it, and one panel
              below follows whatever section is being read. Every panel is
              mounted so their state survives a swap; the inactive ones are
              hidden by CSS, which also lets the narrow breakpoint show the
              whole set stacked instead. */}
          <aside className="tool-sidebar">
            <ChainCanvas chain={chain} dispatch={dispatch} theme={theme} sim={sim} />

            <div className="stage-tabs" role="tablist" aria-label="Tool panels">
              {PANEL_ORDER.map((key) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={panel === key}
                  className={`stage-tab${panel === key ? ' active' : ''}`}
                  onClick={() => selectPanel(key)}
                >
                  {PANEL_LABELS[key]}
                </button>
              ))}
            </div>

            <div className="tool-stage">
              <ValidationBanner chain={chain} validation={validation} />
              <div className="stage-panel" data-active={panel === 'matrix'}>
                <MatrixPanel chain={chain} dispatch={dispatch} />
              </div>
              <div className="stage-panel" data-active={panel === 'simulate'}>
                <SimulationPanel chain={chain} dispatch={dispatch} sim={sim} />
              </div>
              <div className="stage-panel" data-active={panel === 'retention'}>
                <RetentionChart chain={chain} sim={sim} />
              </div>
              <div className="stage-panel" data-active={panel === 'forecast'}>
                {validation.valid && chain.states.length > 0 && (
                  <ForecastPanel chain={chain} matrix={matrix} />
                )}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}

export default App
