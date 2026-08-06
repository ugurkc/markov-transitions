import { useEffect, useMemo, useState } from 'react'
import type { Chain } from '../lib/types'
import { expectedTenure as computeExpectedTenure } from '../lib/analysis'
import type { Simulation } from '../state/useSimulation'

interface RetentionChartProps {
  chain: Chain
  sim: Simulation
}

const W = 440
const PAD_LEFT = 34
const PAD_RIGHT = 12

const LINE_H = 200
const LINE_PAD_TOP = 14
const LINE_PAD_BOTTOM = 28

const BAR_H = 150
const BAR_PAD_TOP = 14
const BAR_PAD_BOTTOM = 28
const BAR_GAP_FRACTION = 0.25

/**
 * Active-player curve: x is weeks elapsed, y is everyone not currently in
 * the output state. Redraws as the simulation plays, growing with the input
 * rate and dipping as players reach the output state — so it visibly answers
 * "how many people are actually still playing, week over week."
 *
 * Below it, a customer-lifetime histogram: bar `w` is how many of the
 * *starting* cohort ended up with a tenure of exactly `w` weeks before
 * reaching the output state. It's a separate, acquisition-free view — mixing
 * in players who joined later would land very different actual lifetimes on
 * the same bar (see useSimulation's shadow run).
 *
 * Both share an x-axis that always spans the full configured run
 * (`sim.periods`), even though the drawn data only reaches the current
 * week — a fixed axis reads far less jumpy than one that keeps resizing
 * itself as playback advances.
 *
 * "Pin as baseline" snapshots the current retention curve so the next run —
 * after an edge is edited — draws alongside it as a ghost line, turning "did
 * that change help" from a memorize-then-compare exercise into something you
 * can just look at. The baseline only makes sense against the same weeks
 * count and clears itself when the chain is swapped out from under it
 * (a new preset, or "Build your own"); it survives edits to the current
 * chain's own probabilities, since comparing before/after an edit is exactly
 * the point.
 *
 * Below the histogram, the expected-tenure figure is deliberately *not*
 * derived from the simulation. A "so far" average over one run's departures
 * would be right-censored — players still active when the run ends are
 * silently excluded, which biases it well below the truth even late in a
 * run (verified: ~3.2 weeks observed vs. 6 analytic, averaged over 2000
 * runs of the default funnel). Instead this is the same closed-form
 * expected-steps-to-absorption the essay's prose quotes, so the number in
 * the tool always matches the number on the page — and it needs no
 * simulation to exist at all.
 */
export function RetentionChart({ chain, sim }: RetentionChartProps) {
  const [baseline, setBaseline] = useState<{ periods: number; series: number[] } | null>(null)

  useEffect(() => {
    setBaseline(null)
  }, [chain.id])

  const expectedTenure = useMemo(() => computeExpectedTenure(chain), [chain])

  if (chain.states.length === 0) return null

  const innerW = W - PAD_LEFT - PAD_RIGHT
  const x = (week: number) => PAD_LEFT + (week / Math.max(sim.periods, 1)) * innerW

  const baselineActive = baseline !== null && baseline.periods === sim.periods

  const lineInnerH = LINE_H - LINE_PAD_TOP - LINE_PAD_BOTTOM
  const yMax = Math.max(...sim.retentionSeries, ...(baselineActive ? baseline.series : []), 1)
  const y = (v: number) => LINE_PAD_TOP + lineInnerH - (v / yMax) * lineInnerH

  const baselinePath = baselineActive
    ? baseline.series.map((v, week) => `${week === 0 ? 'M' : 'L'} ${x(week)} ${y(v)}`).join(' ')
    : ''

  const revealed = sim.retentionSeries.slice(0, sim.period + 1)
  const points = revealed.map((v, week) => ({ x: x(week), y: y(v), week, v }))
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${y(0)} L ${points[0].x} ${y(0)} Z`
      : ''
  const current = points[points.length - 1]

  const barInnerH = BAR_H - BAR_PAD_TOP - BAR_PAD_BOTTOM
  const barMax = Math.max(...sim.lifetimeCounts, 1)
  const barY = (v: number) => BAR_PAD_TOP + barInnerH - (v / barMax) * barInnerH
  const barBaseline = BAR_PAD_TOP + barInnerH
  const barWidth = (innerW / Math.max(sim.periods, 1)) * (1 - BAR_GAP_FRACTION)
  const revealedBars = sim.lifetimeCounts.slice(0, sim.period + 1)
  const outputName = chain.states.find((s) => s.id === chain.outputStateId)?.name

  return (
    <div className="panel retention-panel" data-tool-anchor="retention">
      <h3>Retention</h3>
      <p className="panel-note">
        How many players are actually still active, week by week: new
        arrivals push it up, players reaching{' '}
        {outputName ? <strong>{outputName}</strong> : 'the output state'} pull
        it down.
      </p>

      {sim.hasEndpoints && sim.runnable && (
        <div className="retention-baseline-controls">
          <button
            type="button"
            onClick={() =>
              setBaseline(
                baseline ? null : { periods: sim.periods, series: sim.retentionSeries },
              )
            }
          >
            {baseline ? 'Clear baseline' : 'Pin as baseline'}
          </button>
          {baseline !== null && !baselineActive && (
            <span className="hint">Baseline hidden: weeks count changed</span>
          )}
        </div>
      )}

      {!sim.hasEndpoints ? (
        <p className="hint retention-empty">
          Choose an input and output state to see who&rsquo;s still playing.
        </p>
      ) : !sim.runnable ? (
        <p className="hint retention-empty">
          Fix the invalid rows above to run the simulation.
        </p>
      ) : (
        <>
          <svg
            className="retention-chart"
            viewBox={`0 0 ${W} ${LINE_H}`}
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
              y1={LINE_PAD_TOP}
              x2={PAD_LEFT}
              y2={y(0)}
            />
            <text className="retention-tick" x={PAD_LEFT - 6} y={LINE_PAD_TOP + 4} textAnchor="end">
              {Math.round(yMax)}
            </text>
            <text className="retention-tick" x={PAD_LEFT - 6} y={y(0)} textAnchor="end">
              0
            </text>
            <text className="retention-tick" x={PAD_LEFT} y={LINE_H - 8} textAnchor="start">
              week 0
            </text>
            <text className="retention-tick" x={W - PAD_RIGHT} y={LINE_H - 8} textAnchor="end">
              week {sim.periods}
            </text>
            {areaPath && <path className="retention-area" d={areaPath} />}
            {baselinePath && <path className="retention-line-baseline" d={baselinePath} />}
            {linePath && <path className="retention-line" d={linePath} />}
            {current && <circle className="retention-dot" cx={current.x} cy={current.y} r={3.5} />}
          </svg>

          <p className="sim-group-label retention-subheading">Customer lifetime</p>
          <p className="panel-note">
            Of the players who started the run, how many weeks did they stick
            around before reaching{' '}
            {outputName ? <strong>{outputName}</strong> : 'the output state'}
            ? Bar 0 is players gone within their very first week.
          </p>
          <svg
            className="retention-chart"
            viewBox={`0 0 ${W} ${BAR_H}`}
            role="img"
            aria-label={`Customer lifetime distribution over ${sim.periods} weeks`}
          >
            <line
              className="retention-axis"
              x1={PAD_LEFT}
              y1={barBaseline}
              x2={W - PAD_RIGHT}
              y2={barBaseline}
            />
            <line
              className="retention-axis"
              x1={PAD_LEFT}
              y1={BAR_PAD_TOP}
              x2={PAD_LEFT}
              y2={barBaseline}
            />
            <text className="retention-tick" x={PAD_LEFT - 6} y={BAR_PAD_TOP + 4} textAnchor="end">
              {Math.round(barMax)}
            </text>
            <text className="retention-tick" x={PAD_LEFT - 6} y={barBaseline} textAnchor="end">
              0
            </text>
            <text className="retention-tick" x={PAD_LEFT} y={BAR_H - 8} textAnchor="start">
              week 0
            </text>
            <text className="retention-tick" x={W - PAD_RIGHT} y={BAR_H - 8} textAnchor="end">
              week {sim.periods}
            </text>
            {revealedBars.map((v, week) => (
              <rect
                key={week}
                className="lifetime-bar"
                x={x(week) - barWidth / 2}
                y={barY(v)}
                width={barWidth}
                height={Math.max(0, barBaseline - barY(v))}
              />
            ))}
          </svg>
          {expectedTenure !== null && (
            <p className="retention-mean">
              Expected tenure from{' '}
              <strong>{chain.states.find((s) => s.id === chain.inputStateId)?.name}</strong> to{' '}
              <strong>{outputName}</strong>:{' '}
              <strong>{expectedTenure.toFixed(1)} weeks</strong>
            </p>
          )}
        </>
      )}
    </div>
  )
}
