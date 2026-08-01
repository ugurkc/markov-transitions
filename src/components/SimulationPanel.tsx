import type { Chain } from '../lib/types'
import { MAX_PERIODS, MAX_PLAYERS_PER_STATE, SIM_SPEEDS } from '../state/useSimulation'
import type { SimSpeed, Simulation } from '../state/useSimulation'
import { DistributionBars } from './panels/DistributionBars'

interface SimulationPanelProps {
  chain: Chain
  sim: Simulation
}

/**
 * Controls for the agent-based cohort simulation. Where the Forecast panel
 * computes exact expected proportions, this drops whole players into states
 * and rolls the dice for each one, period by period, animating the result on
 * the canvas above.
 */
export function SimulationPanel({ chain, sim }: SimulationPanelProps) {
  if (chain.states.length === 0) return null

  const total = sim.initialCounts.reduce((a, b) => a + b, 0)
  const scale = Math.max(total, 1)

  return (
    <div className="panel sim-panel">
      <h3>Simulate a cohort</h3>
      <p className="panel-note">
        Drop players into any state and watch them move, one period at a time.
        Each player rolls their own dice against the transition
        probabilities &mdash; so unlike the exact forecast below, results
        wobble from run to run, exactly the way a real cohort does.
      </p>

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
          disabled={!sim.runnable || total === 0}
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
        Periods: {sim.periods}
        <input
          type="range"
          min={1}
          max={MAX_PERIODS}
          value={sim.periods}
          onChange={(e) => sim.setPeriods(Number(e.target.value))}
        />
      </label>

      <p className="sim-period">
        Period <strong>{sim.period}</strong> of {sim.lastPeriod}
      </p>

      <DistributionBars
        items={chain.states.map((s, i) => {
          const n = sim.counts[i] ?? 0
          return { id: s.id, name: s.name, value: n / scale, display: String(n) }
        })}
      />
    </div>
  )
}
