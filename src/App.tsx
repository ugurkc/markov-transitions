import Markdown from 'react-markdown'
import { ChainCanvas } from './components/ChainCanvas'
import { MatrixPanel } from './components/MatrixPanel'
import { RetentionChart } from './components/RetentionChart'
import { Sidebar } from './components/Sidebar'
import { SimulationPanel } from './components/SimulationPanel'
import { ThemeToggle } from './components/ThemeToggle'
import { CalculatorsSection } from './components/panels/CalculatorsSection'
import { loadMeta, loadSections } from './lib/essayContent'
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
            <header className="article-header" id="intro">
              <a className="home-link" href="https://ugurkc.github.io/">
                ← ugurkc.github.io
              </a>
              <p className="eyebrow">{META.eyebrow}</p>
              <h1>{META.title}</h1>
              <Markdown components={{ p: (props) => <p className="subtitle" {...props} /> }}>
                {META.subtitle}
              </Markdown>
            </header>

            {ESSAY_SECTIONS.map((s) => (
              <section key={s.order} id={s.id}>
                {s.heading && <h2>{s.heading}</h2>}
                <Markdown>{s.body}</Markdown>
              </section>
            ))}

            <footer className="article-footer">
              <a href={REPO_URL}>Source on GitHub</a>
            </footer>
          </article>

          <aside className="tool-sidebar">
            <ChainCanvas chain={chain} dispatch={dispatch} theme={theme} sim={sim} />
            <div className="sim-layout">
              <SimulationPanel chain={chain} dispatch={dispatch} sim={sim} />
              <RetentionChart chain={chain} sim={sim} />
            </div>
            <MatrixPanel chain={chain} dispatch={dispatch} />
            <CalculatorsSection chain={chain} />
          </aside>
        </div>
      </main>
    </div>
  )
}

export default App
