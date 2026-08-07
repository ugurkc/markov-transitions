import { describe, expect, it } from 'vitest'
import {
  activeBaseline,
  baselineReducer,
  initialBaselineState,
} from './retentionBaseline'
import type { BaselineAction, BaselineState } from './retentionBaseline'

const SERIES_A = [100, 80, 64, 51]
const SERIES_B = [100, 90, 81, 73]
const PERIODS = 3

/** Apply a script of actions to the initial state. */
const run = (actions: BaselineAction[], from: BaselineState = initialBaselineState) =>
  actions.reduce(baselineReducer, from)

const sim = (
  chainId: string,
  playing: boolean,
  complete: boolean,
  series = SERIES_A,
  periods = PERIODS,
): BaselineAction => ({ type: 'sim', chainId, playing, complete, periods, series })

/** A chip click, the chain loading, and its run playing through to the end. */
const fullRun = (chainId: string, series = SERIES_A): BaselineAction[] => [
  { type: 'scenario-requested', id: chainId },
  sim(chainId, false, false, series),
  sim(chainId, true, false, series),
  sim(chainId, false, true, series),
]

describe('manual pinning', () => {
  it('pins the current curve, then clears it', () => {
    const pinned = run([{ type: 'toggle', periods: PERIODS, series: SERIES_A }])
    expect(pinned.baseline).toEqual({ periods: PERIODS, series: SERIES_A })

    const cleared = baselineReducer(pinned, {
      type: 'toggle',
      periods: PERIODS,
      series: SERIES_B,
    })
    expect(cleared.baseline).toBeNull()
  })

  it('is hidden, not lost, when the weeks count changes', () => {
    const pinned = run([{ type: 'toggle', periods: PERIODS, series: SERIES_A }])
    expect(activeBaseline(pinned, PERIODS)).toEqual({ periods: PERIODS, series: SERIES_A })
    expect(activeBaseline(pinned, PERIODS + 5)).toBeNull()
    // Still held, so returning to the original span brings it back.
    expect(activeBaseline(pinned, PERIODS)).not.toBeNull()
  })
})

describe('example chips arm a pin rather than taking one', () => {
  it('does not pin until the run has finished', () => {
    let state = run([{ type: 'scenario-requested', id: 'q1-baseline' }])
    expect(state.baseline).toBeNull()

    state = baselineReducer(state, sim('q1-baseline', true, false))
    expect(state.baseline, 'mid-run').toBeNull()

    state = baselineReducer(state, sim('q1-baseline', false, true))
    expect(state.baseline, 'finished').toEqual({ periods: PERIODS, series: SERIES_A })
    expect(state.pendingFor, 'disarmed after firing').toBeNull()
  })

  // Regression: loading a new chain leaves the playback position at the end of
  // the *previous* run for a moment, which looks like "already complete". A run
  // must be seen actually running before its completion is believed.
  it('ignores a stale completion from the previous run', () => {
    const state = run([
      { type: 'scenario-requested', id: 'q1-faster' },
      // Position still parked at the end of the run that just finished.
      sim('q1-faster', false, true),
    ])
    expect(state.baseline, 'pinned before its own run started').toBeNull()
    expect(state.pendingFor, 'still armed').toBe('q1-faster')
  })

  it('pins once the real run completes after that stale frame', () => {
    const state = run([
      { type: 'scenario-requested', id: 'q1-faster' },
      sim('q1-faster', false, true), // stale
      sim('q1-faster', true, false), // actually running
      sim('q1-faster', false, true), // genuinely done
    ])
    expect(state.baseline).toEqual({ periods: PERIODS, series: SERIES_A })
  })

  it('ignores progress from a chain that is not the armed one', () => {
    const state = run([
      { type: 'scenario-requested', id: 'q1-baseline' },
      sim('preset-winback', true, false),
      sim('preset-winback', false, true),
    ])
    expect(state.baseline).toBeNull()
    expect(state.pendingFor).toBe('q1-baseline')
  })

  it('keeps the existing baseline when a later chip finishes, and disarms', () => {
    const state = run([...fullRun('q1-baseline', SERIES_A), ...fullRun('q1-faster', SERIES_B)])
    expect(state.baseline, 'first example stays the reference').toEqual({
      periods: PERIODS,
      series: SERIES_A,
    })
    expect(state.pendingFor).toBeNull()
  })

  it('re-arms when a newer chip is clicked mid-run', () => {
    const state = run([
      { type: 'scenario-requested', id: 'q1-baseline' },
      sim('q1-baseline', true, false),
      { type: 'scenario-requested', id: 'q1-faster' },
    ])
    expect(state.pendingFor).toBe('q1-faster')
    expect(state.seenRunning, 'must watch the new run from scratch').toBe(false)
  })
})

describe('the reader always wins over an armed chip', () => {
  // Regression: clicking a chip while a baseline was already pinned used to
  // leave the pin armed forever, so the very next "Clear baseline" was undone
  // by it firing again — the button looked broken.
  it('clearing stays cleared while a chip is armed', () => {
    let state = run(fullRun('q1-baseline'))
    expect(state.baseline).not.toBeNull()

    // Same chip again: arms a pin that can never fire (a baseline exists).
    state = baselineReducer(state, { type: 'scenario-requested', id: 'q1-baseline' })
    state = baselineReducer(state, sim('q1-baseline', true, false))
    state = baselineReducer(state, sim('q1-baseline', false, true))

    state = baselineReducer(state, { type: 'toggle', periods: PERIODS, series: SERIES_B })
    expect(state.baseline, 'clear must stick').toBeNull()
    expect(state.pendingFor).toBeNull()

    // And nothing left over to re-pin it behind the reader's back.
    state = baselineReducer(state, sim('q1-baseline', false, true))
    expect(state.baseline).toBeNull()
  })

  it('a manual pin mid-run disarms the chip that was waiting', () => {
    let state = run([
      { type: 'scenario-requested', id: 'q1-gentler' },
      sim('q1-gentler', true, false),
      { type: 'toggle', periods: PERIODS, series: SERIES_B },
    ])
    expect(state.baseline).toEqual({ periods: PERIODS, series: SERIES_B })
    expect(state.pendingFor).toBeNull()

    state = baselineReducer(state, sim('q1-gentler', false, true))
    expect(state.baseline, 'the run finishing must not overwrite it').toEqual({
      periods: PERIODS,
      series: SERIES_B,
    })
  })
})

describe('switching to a different chain', () => {
  it('drops a baseline that no longer compares like for like', () => {
    const state = run([...fullRun('q1-baseline'), { type: 'family-changed' }])
    expect(state.baseline).toBeNull()
  })

  it('still pins the incoming example once it finishes', () => {
    const state = run([
      ...fullRun('q1-baseline', SERIES_A),
      // Clicking a chip from another family: chain loads, family resets.
      { type: 'scenario-requested', id: 'q3-baseline' },
      { type: 'family-changed' },
      sim('q3-baseline', true, false),
      sim('q3-baseline', false, true, SERIES_B),
    ])
    expect(state.baseline).toEqual({ periods: PERIODS, series: SERIES_B })
  })

  it('makes a mid-run family change restart the watch', () => {
    const state = run([
      { type: 'scenario-requested', id: 'q3-baseline' },
      sim('q3-baseline', true, false),
      { type: 'family-changed' },
    ])
    expect(state.seenRunning).toBe(false)
    expect(state.pendingFor).toBe('q3-baseline')
  })
})

describe('reducer hygiene', () => {
  it('never mutates the state it is given', () => {
    const before = run(fullRun('q1-baseline'))
    const snapshot = structuredClone(before)
    baselineReducer(before, { type: 'scenario-requested', id: 'q1-faster' })
    baselineReducer(before, { type: 'family-changed' })
    baselineReducer(before, { type: 'toggle', periods: PERIODS, series: SERIES_B })
    baselineReducer(before, sim('q1-baseline', true, false))
    expect(before).toEqual(snapshot)
  })

  it('returns the identical object when nothing changes, so React can skip work', () => {
    const armed = run([
      { type: 'scenario-requested', id: 'q1-baseline' },
      sim('q1-baseline', true, false),
    ])
    // Same running frame again, and frames for other chains.
    expect(baselineReducer(armed, sim('q1-baseline', true, false))).toBe(armed)
    expect(baselineReducer(armed, sim('other', true, false))).toBe(armed)
    // Idle with nothing armed.
    expect(baselineReducer(initialBaselineState, sim('x', false, true))).toBe(
      initialBaselineState,
    )
  })

  it('survives a completion frame arriving repeatedly', () => {
    let state = run(fullRun('q1-baseline', SERIES_A))
    const pinned = state.baseline
    for (let i = 0; i < 5; i++) state = baselineReducer(state, sim('q1-baseline', false, true))
    expect(state.baseline).toEqual(pinned)
  })
})
