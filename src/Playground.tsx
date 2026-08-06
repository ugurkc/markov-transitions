import { ChainCanvas } from './components/ChainCanvas'
import { MatrixPanel } from './components/MatrixPanel'
import { RetentionChart } from './components/RetentionChart'
import { SimulationPanel } from './components/SimulationPanel'
import { ThemeToggle } from './components/ThemeToggle'
import { CalculatorsSection } from './components/panels/CalculatorsSection'
import { useChain } from './state/useChain'
import { useSimulation } from './state/useSimulation'
import { useTheme } from './state/useTheme'

const ESSAY_URL = import.meta.env.BASE_URL

/**
 * The simulator with the essay taken away: same components, same persisted
 * chain, but the graph gets the room the two-column reading layout can't
 * spare. Deliberately a separate page rather than a mode toggle -- someone
 * who wants to build their own lifecycle is doing a different thing than
 * someone reading, and this way it has a URL they can come back to.
 */
export default function Playground() {
  const { chain, dispatch } = useChain()
  const [theme, setTheme] = useTheme()
  const sim = useSimulation(chain)

  // Deliberately not `.page`: that class is the essay's flex row for the
  // table-of-contents rail, and it squeezes this layout into a narrow column.
  return (
    <div className="play-page">
      <ThemeToggle
        theme={theme}
        onToggle={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      />
      <header className="play-header">
        <a className="home-link" href={ESSAY_URL}>
          ← Back to the essay
        </a>
        <h1>Playground</h1>
        <p className="play-intro">
          The whole tool, with the writing out of the way. Start from a preset
          or build a lifecycle of your own: drag states around, rewire
          transitions, click any matrix cell to retype a probability, then drop
          a cohort in and watch where they end up. Whatever you build is saved
          in this browser, so the essay picks up where you left off.
        </p>
      </header>

      <div className="play-layout">
        <div className="play-canvas">
          <ChainCanvas chain={chain} dispatch={dispatch} theme={theme} sim={sim} />
        </div>
        <div className="play-panels">
          <SimulationPanel chain={chain} dispatch={dispatch} sim={sim} />
          <MatrixPanel chain={chain} dispatch={dispatch} />
          <RetentionChart chain={chain} sim={sim} />
          <CalculatorsSection chain={chain} />
        </div>
      </div>
    </div>
  )
}
