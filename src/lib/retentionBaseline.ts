/**
 * The retention chart's baseline: which curve is pinned as the ghost line to
 * compare the live run against, and when an example chip's run should pin
 * itself automatically.
 *
 * This lives outside the component because the rules are a genuine little
 * state machine with edge cases that are painful to reason about (and were
 * previously wrong) when spread across React effects:
 *
 *   - Clicking an example chip *arms* a pin rather than taking one. The pin
 *     happens only once that example's own run has actually finished
 *     calculating, so the reader watches it compute before it becomes the
 *     reference line.
 *   - "Finished" cannot be read from the playback position alone. When a new
 *     chain loads, the position is briefly still at the end of the *previous*
 *     run before it rewinds, which reads as "already complete" and used to
 *     pin instantly. So a run must be observed actually running before its
 *     completion counts (`seenRunning`).
 *   - Anything the reader does by hand wins. Pressing the button — to pin or
 *     to clear — disarms any armed chip, so a clear stays cleared instead of
 *     being immediately undone by a pin that was still waiting in the wings.
 *   - An armed chip whose run completes while a baseline is already pinned
 *     disarms without pinning: the existing reference stays put, and nothing
 *     lingers to fire later.
 */

export interface BaselineSnapshot {
  /** Weeks the run covered. A baseline only makes sense against the same count. */
  periods: number
  series: number[]
}

export interface BaselineState {
  baseline: BaselineSnapshot | null
  /** Chain id whose finished run should become the baseline, if any. */
  pendingFor: string | null
  /** Whether the pending chain's run has been seen actually running. */
  seenRunning: boolean
}

export const initialBaselineState: BaselineState = {
  baseline: null,
  pendingFor: null,
  seenRunning: false,
}

export type BaselineAction =
  /** An essay example chip was clicked; its chain is about to load. */
  | { type: 'scenario-requested'; id: string }
  /** The chain switched to a different comparison family (new preset, custom). */
  | { type: 'family-changed' }
  /** The reader pressed the pin/clear button themselves. */
  | { type: 'toggle'; periods: number; series: number[] }
  /** Simulation progress for the chain currently on screen. */
  | {
      type: 'sim'
      chainId: string
      playing: boolean
      /** Run has reached its final week (and has more than a single frame). */
      complete: boolean
      periods: number
      series: number[]
    }

export function baselineReducer(
  state: BaselineState,
  action: BaselineAction,
): BaselineState {
  switch (action.type) {
    case 'scenario-requested':
      return { ...state, pendingFor: action.id, seenRunning: false }

    // A different chain entirely: the old curve is no longer a like-for-like
    // comparison. Any armed chip survives, because loading its chain is what
    // triggers this in the first place.
    case 'family-changed':
      return { ...state, baseline: null, seenRunning: false }

    case 'toggle':
      return {
        baseline: state.baseline
          ? null
          : { periods: action.periods, series: action.series },
        pendingFor: null,
        seenRunning: false,
      }

    case 'sim': {
      if (state.pendingFor === null || state.pendingFor !== action.chainId) return state

      if (action.playing) {
        return state.seenRunning ? state : { ...state, seenRunning: true }
      }

      // Not playing: only a run we watched start counts as finished. Otherwise
      // this is the stale tail of the previous run, before the rewind lands.
      if (!state.seenRunning || !action.complete) return state

      return {
        // A baseline already on screen stays; it's the reference this run is
        // being compared against.
        baseline:
          state.baseline ?? { periods: action.periods, series: action.series },
        pendingFor: null,
        seenRunning: false,
      }
    }

    default:
      return state
  }
}

/** The pinned curve, but only while it still describes the same span of weeks. */
export function activeBaseline(
  state: BaselineState,
  periods: number,
): BaselineSnapshot | null {
  if (!state.baseline || state.baseline.periods !== periods) return null
  return state.baseline
}
