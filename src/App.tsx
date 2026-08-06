import { isValidElement, memo } from 'react'
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
import { CalculatorsSection } from './components/panels/CalculatorsSection'
import { loadMeta, loadSections } from './lib/essayContent'
import { requestPreset } from './lib/toolBridge'
import { useChain } from './state/useChain'
import { useSimulation } from './state/useSimulation'
import { useTheme } from './state/useTheme'

const REPO_URL = 'https://github.com/ugurkc/watershed'

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

function App() {
  const { chain, dispatch } = useChain()
  const [theme, setTheme] = useTheme()
  const sim = useSimulation(chain)
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

          <aside className="tool-sidebar">
            <ChainCanvas chain={chain} dispatch={dispatch} theme={theme} sim={sim} />
            <MatrixPanel chain={chain} dispatch={dispatch} />
            <div className="sim-layout">
              <SimulationPanel chain={chain} dispatch={dispatch} sim={sim} />
              <RetentionChart chain={chain} sim={sim} />
            </div>
            <CalculatorsSection chain={chain} />
          </aside>
        </div>
      </main>
    </div>
  )
}

export default App
