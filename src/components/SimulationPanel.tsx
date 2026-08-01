import type { Chain } from '../lib/types'
import type { ChainAction } from '../state/chainReducer'
import { MAX_PLAYERS_PER_STATE, MAX_WEEKS, SIM_SPEEDS } from '../state/useSimulation'
import type { SimSpeed, Simulation } from '../state/useSimulation'
import { DistributionBars } from './panels/DistributionBars'

interface SimulationPanelProps {
  chain: Chain
  dispatch: React.Dispatch<ChainAction>
  sim: Simulation
}

/**
 * Controls for the agent-based cohort simulation. Where the Forecast panel
 * computes exact expected proportions, this drops whole players into states
 * and rolls the dice for each one, week by week, animating the result on
 * the canvas above.
 */
export function SimulationPanel({ chain, dispatch, sim }: SimulationPanelProps) {
  if (chain.states.length === 0) return null

  const total = sim.initialCounts.reduce((a, b) => a + b, 0)
  const displayTotal = sim.displayCounts.reduce((a, b) => a + b, 0)
  // Scaled to the *current* population, not the starting one — the input
  // rate grows the cohort over the run, and a fixed scale would send bars
  // past 100% width the moment new players outnumber the original total.
  const scale = Math.max(displayTotal, 1)

  return (
    <div className="panel sim-panel">
      <h3>Simulate a cohort</h3>

      <p className="sim-group-label">Input &amp; output</p>
      <div className="sim-endpoints">
        <label className="field">
          Input state
          <select
            value={chain.inputStateId ?? ''}
            onChange={(e) =>
              dispatch({ type: 'setInputState', id: e.target.value || null })
            }
          >
            <option value="">Choose a state&hellip;</option>
            {chain.states
              .filter((s) => s.id !== chain.outputStateId)
              .map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
          </select>
        </label>
        <label className="field">
          Output state
          <select
            value={chain.outputStateId ?? ''}
            onChange={(e) =>
              dispatch({ type: 'setOutputState', id: e.target.value || null })
            }
          >
            <option value="">Choose a state&hellip;</option>
            {chain.states
              .filter((s) => s.id !== chain.inputStateId)
              .map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
          </select>
        </label>
        <label className="field sim-input-rate">
          New players / week
          <input
            type="number"
            min={0}
            max={MAX_PLAYERS_PER_STATE}
            step={5}
            disabled={!chain.inputStateId}
            value={sim.inputRate}
            onChange={(e) => sim.setInputRate(Number(e.target.value))}
          />
        </label>
      </div>
      {!sim.hasEndpoints && (
        <p className="inline-warning">
          Pick an input state (where new players join) and an output state
          (where players leave) above to run the simulation.
        </p>
      )}

      <p className="sim-group-label">Starting population</p>
      <div className="sim-inputs">
        {chain.states.map((s, i) => (
          <label key={s.id} className="sim-input">
            <span>{s.name}</span>
            <input
              type="number"
              min={0}
              max={MAX_PLAYERS_PER_STATE}
              step={10}
              value={sim.initialCounts[i]}
              onChange={(e) => sim.setCount(s.id, Number(e.target.value))}
            />
          </label>
        ))}
        <p className="sim-total">{total} players total</p>
      </div>

      <div className="sim-controls">
        <button
          type="button"
          className="sim-primary"
          onClick={sim.playing ? sim.pause : sim.play}
          disabled={!sim.runnable || (total === 0 && sim.inputRate === 0)}
        >
          {sim.playing ? '❙❙ Pause' : '▶ Play'}
        </button>
        <button
          type="button"
          onClick={sim.step}
          disabled={!sim.runnable || sim.period >= sim.lastPeriod}
        >
          Step
        </button>
        <button type="button" onClick={sim.reset} disabled={!sim.runnable}>
          Reset
        </button>
        <button type="button" onClick={sim.reroll} disabled={!sim.runnable}>
          New run
        </button>
        <label className="sim-speed">
          Speed
          <select
            value={sim.speed}
            onChange={(e) => sim.setSpeed(e.target.value as SimSpeed)}
          >
            {SIM_SPEEDS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="field">
        Weeks: {sim.periods}
        <input
          type="range"
          min={1}
          max={MAX_WEEKS}
          value={sim.periods}
          onChange={(e) => sim.setPeriods(Number(e.target.value))}
        />
      </label>

      <p className="sim-period">
        Week <strong>{sim.period}</strong> of {sim.lastPeriod}
        {sim.inputRate > 0 && ` · ${displayTotal} in the system now`}
      </p>

      <DistributionBars
        items={chain.states.map((s, i) => {
          const n = sim.displayCounts[i] ?? 0
          return { id: s.id, name: s.name, value: n / scale, display: String(n) }
        })}
      />

      <p className="panel-note sim-explainer">
        Drop players into any state and watch them move, one week at a time.
        Each player rolls their own dice against the transition
        probabilities &mdash; so unlike the exact forecast further down,
        results wobble from run to run, exactly the way a real cohort does.
      </p>
    </div>
  )
}
