import type { Chain } from '../lib/types'
import type { Simulation } from '../state/useSimulation'

interface RetentionChartProps {
  chain: Chain
  sim: Simulation
}

const W = 440
const H = 200
const PAD_LEFT = 34
const PAD_RIGHT = 12
const PAD_TOP = 14
const PAD_BOTTOM = 28

/**
 * Active-player curve: x is weeks elapsed, y is everyone not currently in
 * the output state. Redraws as the simulation plays, growing with the input
 * rate and dipping as players reach the output state — so it visibly answers
 * "how many people are actually still playing, week over week."
 *
 * The x-axis always spans the full configured run (`sim.periods`), even
 * though the drawn line only reaches the current week — a fixed axis reads
 * far less jumpy than one that keeps resizing itself as playback advances.
 */
export function RetentionChart({ chain, sim }: RetentionChartProps) {
  if (chain.states.length === 0) return null

  const innerW = W - PAD_LEFT - PAD_RIGHT
  const innerH = H - PAD_TOP - PAD_BOTTOM
  const x = (week: number) => PAD_LEFT + (week / Math.max(sim.periods, 1)) * innerW
  const yMax = Math.max(...sim.retentionSeries, 1)
  const y = (v: number) => PAD_TOP + innerH - (v / yMax) * innerH

  const revealed = sim.retentionSeries.slice(0, sim.period + 1)
  const points = revealed.map((v, week) => ({ x: x(week), y: y(v), week, v }))
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${y(0)} L ${points[0].x} ${y(0)} Z`
      : ''
  const current = points[points.length - 1]

  return (
    <div className="panel retention-panel">
      <h3>Retention</h3>
      <p className="panel-note">
        How many players are actually still active, week by week &mdash; new
        arrivals push it up, players reaching{' '}
        {chain.outputStateId
          ? <strong>{chain.states.find((s) => s.id === chain.outputStateId)?.name}</strong>
          : 'the output state'}{' '}
        pull it down.
      </p>

      {!sim.hasEndpoints ? (
        <p className="hint retention-empty">
          Choose an input and output state to see who&rsquo;s still playing.
        </p>
      ) : !sim.runnable ? (
        <p className="hint retention-empty">
          Fix the invalid rows above to run the simulation.
        </p>
      ) : (
        <svg
          className="retention-chart"
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Active players over ${sim.periods} weeks, currently ${current?.v ?? 0} at week ${sim.period}`}
        >
          <line
            className="retention-axis"
            x1={PAD_LEFT}
            y1={y(0)}
            x2={W - PAD_RIGHT}
            y2={y(0)}
          />
          <line
            className="retention-axis"
            x1={PAD_LEFT}
            y1={PAD_TOP}
            x2={PAD_LEFT}
            y2={y(0)}
          />
          <text className="retention-tick" x={PAD_LEFT - 6} y={PAD_TOP + 4} textAnchor="end">
            {Math.round(yMax)}
          </text>
          <text className="retention-tick" x={PAD_LEFT - 6} y={y(0)} textAnchor="end">
            0
          </text>
          <text className="retention-tick" x={PAD_LEFT} y={H - 8} textAnchor="start">
            week 0
          </text>
          <text className="retention-tick" x={W - PAD_RIGHT} y={H - 8} textAnchor="end">
            week {sim.periods}
          </text>
          {areaPath && <path className="retention-area" d={areaPath} />}
          {linePath && <path className="retention-line" d={linePath} />}
          {current && <circle className="retention-dot" cx={current.x} cy={current.y} r={3.5} />}
        </svg>
      )}
    </div>
  )
}
