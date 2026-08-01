import { ChainCanvas } from './components/ChainCanvas'
import { Placeholder } from './components/Placeholder'
import { CalculatorsSection } from './components/panels/CalculatorsSection'
import { useChain } from './state/useChain'

const REPO_URL = 'https://github.com/ugurkc/markov-transitions'

function App() {
  const { chain, dispatch } = useChain()
  return (
    <main>
      <article className="article">
        <header className="article-header">
          <h1>Player Lifecycles as Markov Chains</h1>
          <p className="placeholder">
            Subtitle: one sentence on what the reader will be able to do by
            the end of this article.
          </p>
        </header>

        <Placeholder hint="Why model players as a Markov chain? Hook the reader; 2–3 paragraphs." />

        <Placeholder
          heading="States and transitions"
          hint="Explain what a state is; introduce the player-lifecycle example (new, active, dormant, churned) and transitions between them."
        />

        <Placeholder
          heading="The transition matrix"
          hint="How to read a row as the outgoing probabilities of one state; each row sums to 1. Point out sticky states (large diagonal) vs leaky ones."
        />

        <section className="tool-section">
          <h2>Try it: build your own player lifecycle</h2>
          <ChainCanvas chain={chain} dispatch={dispatch} />
          <CalculatorsSection chain={chain} />
        </section>

        <Placeholder
          heading="Absorbing states: modeling churn"
          hint="Walk through absorption probabilities and expected time to churn using the funnel preset in the tool above."
        />

        <Placeholder
          heading="Steady state: modeling win-back"
          hint="Load the win-back preset and discuss the long-run equilibrium mix of players — what the steady state says about a win-back loop."
        />

        <Placeholder hint="Closing notes: caveats of the Markov assumption, ideas for extensions, further reading." />

        <footer className="article-footer">
          <a href={REPO_URL}>Source on GitHub</a>
        </footer>
      </article>
    </main>
  )
}

export default App
