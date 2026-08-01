import { ChainCanvas } from './components/ChainCanvas'
import { MatrixPanel } from './components/MatrixPanel'
import { Placeholder } from './components/Placeholder'
import { Sidebar } from './components/Sidebar'
import { ThemeToggle } from './components/ThemeToggle'
import { CalculatorsSection } from './components/panels/CalculatorsSection'
import { useChain } from './state/useChain'
import { useTheme } from './state/useTheme'

const REPO_URL = 'https://github.com/ugurkc/markov-transitions'

const SECTIONS = [
  { id: 'intro', label: 'Introduction' },
  { id: 'states-and-transitions', label: 'States and transitions' },
  { id: 'transition-matrix', label: 'The transition matrix' },
  { id: 'try-it', label: 'Try it yourself' },
  { id: 'absorbing-states', label: 'Absorbing states: churn' },
  { id: 'steady-state', label: 'Steady state: win-back' },
]

function App() {
  const { chain, dispatch } = useChain()
  const [theme, setTheme] = useTheme()
  return (
    <div className="page">
      <ThemeToggle
        theme={theme}
        onToggle={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      />
      <Sidebar sections={SECTIONS} />
      <main>
        <article className="article">
          <header className="article-header" id="intro">
            <p className="eyebrow">Interactive essay</p>
            <h1>Player Lifecycles as Markov Chains</h1>
            <p className="placeholder">
              Subtitle: one sentence on what the reader will be able to do by
              the end of this article.
            </p>
          </header>

          <Placeholder hint="Why model players as a Markov chain? Hook the reader; 2–3 paragraphs." />

          <Placeholder
            id="states-and-transitions"
            heading="States and transitions"
            hint="Explain what a state is; introduce the player-lifecycle example (new, active, dormant, churned) and transitions between them."
          />

          <Placeholder
            id="transition-matrix"
            heading="The transition matrix"
            hint="How to read a row as the outgoing probabilities of one state; each row sums to 1. Point out sticky states (large diagonal) vs leaky ones."
          />

          <section className="tool-section" id="try-it">
            <h2>Try it: build your own player lifecycle</h2>
            <ChainCanvas chain={chain} dispatch={dispatch} theme={theme} />
            <MatrixPanel chain={chain} dispatch={dispatch} />
            <CalculatorsSection chain={chain} />
          </section>

          <Placeholder
            id="absorbing-states"
            heading="Absorbing states: modeling churn"
            hint="Walk through absorption probabilities and expected time to churn using the funnel preset in the tool above."
          />

          <Placeholder
            id="steady-state"
            heading="Steady state: modeling win-back"
            hint="Load the win-back preset and discuss the long-run equilibrium mix of players — what the steady state says about a win-back loop."
          />

          <Placeholder hint="Closing notes: caveats of the Markov assumption, ideas for extensions, further reading." />

          <footer className="article-footer">
            <a href={REPO_URL}>Source on GitHub</a>
          </footer>
        </article>
      </main>
    </div>
  )
}

export default App
