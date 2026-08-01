import { ChainCanvas } from './components/ChainCanvas'
import { MatrixPanel } from './components/MatrixPanel'
import { RetentionChart } from './components/RetentionChart'
import { Sidebar } from './components/Sidebar'
import { SimulationPanel } from './components/SimulationPanel'
import { ThemeToggle } from './components/ThemeToggle'
import { CalculatorsSection } from './components/panels/CalculatorsSection'
import { useChain } from './state/useChain'
import { useSimulation } from './state/useSimulation'
import { useTheme } from './state/useTheme'

const REPO_URL = 'https://github.com/ugurkc/watershed'

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
              <p className="eyebrow">Player lifecycles as Markov chains</p>
              <h1>Watershed</h1>
              <p className="subtitle">
                By the time you reach the bottom of this page, you&rsquo;ll be
                able to build a living model of how your players move &mdash;
                and prove to yourself that you can&rsquo;t move the
                destination, only the path that leads there.
              </p>
            </header>

            <section>
              <p>
                Every player who has ever touched your game is, in a very real
                sense, just&nbsp;<em>moving</em>. They arrive as strangers,
                poke around the tutorial, maybe fall in love with your
                progression system, maybe get bored and wander off. If you
                squint, a player&rsquo;s whole relationship with your game is
                a sequence of small decisions: stay a little longer, or drift
                away.
              </p>
              <p>
                A Markov chain is a beautifully simple way to describe that
                motion. The core idea fits in one sentence: wherever a player
                is <em>right now</em>, there&rsquo;s some probability
                they&rsquo;ll be in each possible state next week &mdash; and
                that&rsquo;s all you need to know to predict what happens
                next. No history, no baggage, just today.
              </p>
              <p>
                That&rsquo;s less intimidating than it sounds, and you
                don&rsquo;t need a statistics background to use it. This page
                walks through the idea with an actual player lifecycle
                &mdash; tutorial, leveling, endgame, churn &mdash; that you
                can rearrange, rewire, and even break with your own hands.
                The tool is right there on the right, live the whole time you
                read.
              </p>
            </section>

            <section id="states-and-transitions">
              <h2>States and transitions</h2>
              <p>
                A <strong>state</strong> is just a label for &ldquo;where a
                player currently stands&rdquo; in their relationship with your
                game. The example loaded in the tool on the right uses four:{' '}
                <strong>Tutorial</strong> (brand new, still learning the
                ropes), <strong>Leveling</strong> (comfortable, making steady
                progress), <strong>Endgame</strong> (mastered the core loop,
                chasing whatever&rsquo;s left), and <strong>Churned</strong>{' '}
                (gone quiet &mdash; no more sessions).
              </p>
              <p>
                A <strong>transition</strong> is the probability that a player
                hops from one state to another between now and the next
                check-in &mdash; a week, in this example, though you can use
                whatever cadence fits your game. Some transitions are hopeful:
                Tutorial &rarr; Leveling means someone stuck around long
                enough to &ldquo;get it.&rdquo; Others are the ones that keep
                product managers up at night: Leveling &rarr; Churned.
              </p>
              <p>
                Here&rsquo;s the one rule that makes the whole system work:
                every state&rsquo;s outgoing probabilities have to add up to
                100%. A player in Tutorial this week is <em>somewhere</em>{' '}
                next week &mdash; maybe still in Tutorial, maybe graduated to
                Leveling, maybe churned. There&rsquo;s no fourth option where
                they quietly vanish from the math. That one constraint is what
                turns a pile of guesses into an actual predictive model.
              </p>
            </section>

            <section id="transition-matrix">
              <h2>The transition matrix</h2>
              <p>
                All of those transitions live together in one tidy grid: the{' '}
                <strong>transition matrix</strong>. Look at the &ldquo;Transition
                matrix&rdquo; table in the tool on the right and you&rsquo;ll
                see exactly this &mdash; one row per starting state, one
                column per destination, and every cell a probability.
              </p>
              <p>
                Read a row left to right and you&rsquo;re reading a
                state&rsquo;s entire future, laid out as percentages. Take the
                Tutorial row in the default example: 50% chance of staying
                put, 30% chance of graduating to Leveling, 20% chance of
                churning. Add those three up &mdash; 0.5 + 0.3 + 0.2 &mdash;
                and you get exactly 1. Same rule as a moment ago, just made
                visible.
              </p>
              <p>
                The diagonal (Tutorial &rarr; Tutorial, Leveling &rarr;
                Leveling, and so on) tells you how <strong>sticky</strong> a
                state is &mdash; how likely a player is to just stay put. A
                high diagonal number is comforting: people are settling in. A
                low one, paired with a big number elsewhere in the row, means
                the state is <strong>leaky</strong> &mdash; players pass
                through it quickly. Endgame&rsquo;s 85% self-loop, for
                instance, says players who reach it tend to stay &mdash;
                exactly what you&rsquo;d hope for the state you worked
                hardest to build.
              </p>
              <p>
                Best part: this table isn&rsquo;t just for reading. Click any
                cell and type a new number &mdash; the canvas on the right
                updates instantly, and so does every calculator underneath it.
                It&rsquo;s the fastest way to sanity-check &ldquo;what if
                churn from Leveling were lower&rdquo; without ever opening a
                spreadsheet.
              </p>
              <p>
                And if the probabilities still feel abstract, drop a hundred
                players into the <strong>Simulate a cohort</strong> panel and
                hit play. Every dot travelling along an edge is a player who
                just rolled these exact numbers &mdash; the matrix, made of
                people.
              </p>
            </section>

            <section id="try-it">
              <h2>Try it: build your own player lifecycle</h2>
              <p>
                Everything on the right is live for the rest of this page.
                Drag states around, rewire transitions, drop players into the
                simulator, and watch the graphs update in real time. The
                funnel-with-churn example above is loaded by default &mdash;
                switch to the win-back preset, or start from a blank canvas
                with &ldquo;Build your own&rdquo; and wire up a lifecycle of
                your own.
              </p>
            </section>

            <section id="absorbing-states">
              <h2>Absorbing states: modeling churn</h2>
              <p>
                Some states are one-way doors. In the{' '}
                <strong>Player funnel with churn</strong> preset (the first
                tab in the tool on the right), Churned is what&rsquo;s called
                an <strong>absorbing state</strong> &mdash; once a player
                lands there, they stay there forever. Its row in the matrix
                is 100% self-loop; there&rsquo;s no way back out.
              </p>
              <p>
                Run the simulation on this preset and look at the{' '}
                <strong>Customer lifetime</strong> histogram in the Retention
                section on the right. It buckets the starting cohort by
                exactly how many weeks it took each of them to land in
                Churned &mdash; the same question every retention team
                actually cares about, answered player by player instead of
                as one averaged number.
              </p>
              <p>
                For this preset, the honest answer is: everyone eventually
                churns, 100%, no exceptions &mdash; Churned is the only door
                that never opens back up. What differs is the <em>when</em>.
                A cohort starting in Tutorial averages about{' '}
                <strong>6 weeks</strong> before they&rsquo;re gone, spread out
                across the histogram rather than landing on one week. Zero
                out Tutorial&rsquo;s starting population and put everyone in
                Leveling or Endgame instead, and that same histogram shifts
                right &mdash; those players buy a little more time, roughly{' '}
                <strong>6.7 weeks</strong> on average, because they&rsquo;ve
                already proven they&rsquo;re a bit stickier than a brand-new
                arrival.
              </p>
              <p>
                Try it yourself: make that starting-population change, rerun
                the simulation, and watch the histogram move. Then nudge
                Endgame&rsquo;s self-loop probability up in the matrix table
                and rerun again &mdash; that&rsquo;s the whole game of
                retention work, distilled into one number in one table.
              </p>
            </section>

            <section id="steady-state">
              <h2>Steady state: modeling win-back</h2>
              <p>
                Not every chain ends in a dead end. Switch to the{' '}
                <strong>Win-back loop</strong> preset and you&rsquo;ll notice
                Churned isn&rsquo;t absorbing anymore &mdash; 20% of churned
                players wander back in as <strong>Returning</strong>, and
                from there most of them (70%) make their way to Leveling.
                Suddenly there&rsquo;s no permanent exit at all: every player
                just cycles through states forever.
              </p>
              <p>
                When a chain has no absorbing states, &ldquo;expected time to
                churn&rdquo; stops making sense &mdash; there&rsquo;s no churn
                to expect, since in the long run everyone just keeps moving.
                Instead, the tool shows you the <strong>Steady state</strong>:
                if you let this whole system run for a very long time, what
                fraction of your player base ends up in each state, on any
                given day, forever?
              </p>
              <p>
                Run the numbers on this preset and the picture is a little
                humbling: in the long run, <strong>46.9%</strong> of your
                players are sitting in Churned at any given moment &mdash;
                nearly half your base, quietly dormant, in every single
                snapshot in time. Only <strong>27.3%</strong> are enjoying
                Endgame, <strong>16.4%</strong> are Leveling, and a modest{' '}
                <strong>9.4%</strong> are freshly Returning. Tutorial rounds
                down to essentially 0%, because almost nobody stays a
                brand-new player for long &mdash; they either progress or
                churn within a week or two.
              </p>
              <p>
                That 46.9% is the real value of modeling a win-back loop:
                it&rsquo;s not a doom number, it&rsquo;s a target. Every
                tenth of a percent you shave off Churned&rsquo;s self-loop
                &mdash; by getting a win-back offer in front of players
                faster, or smoothing the on-ramp back into Leveling &mdash;
                permanently reshapes that whole steady-state mix in your
                favor.
              </p>
            </section>

            <section>
              <p>
                A few honest caveats before you go build your own. A Markov
                chain assumes the future only depends on where a player is{' '}
                <em>right now</em> &mdash; not how they got there, not how
                long they&rsquo;ve been there, not what day of the week it
                is. Real players are messier than that: someone who&rsquo;s
                been stuck in Tutorial for one week behaves differently than
                someone stuck there for eight. If that distinction matters
                for your game, you&rsquo;ll eventually want richer models
                &mdash; but this one gets you shockingly far for how simple
                it is, and it&rsquo;s the right place to start.
              </p>
              <p>
                The states and probabilities baked into the two presets here
                are illustrative, not measured &mdash; plug in your own
                numbers from real cohort data and the same math turns into a
                genuinely useful forecasting tool. Natural next steps from
                there include splitting states by acquisition channel or
                platform, modeling seasonal shifts by re-estimating the
                matrix month over month, or feeding the customer-lifetime
                numbers straight into a lifetime-value model.
              </p>
              <p>
                If you build something with this, or find a bug, the source
                is right here &mdash; link in the footer. Happy modeling.
              </p>
            </section>

            <footer className="article-footer">
              <a href={import.meta.env.BASE_URL}>&larr; More writing</a>
              <span aria-hidden="true"> &middot; </span>
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
