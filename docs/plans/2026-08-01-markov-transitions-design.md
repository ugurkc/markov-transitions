# Markov Transitions — Design

**Date**: 2026-08-01
**Status**: Awaiting review

## Purpose

A GitHub Pages site that teaches how Markov chains model player behavior and
lifecycle (leveling, churn, win-back), built around an interactive tool where
readers define their own states and transition probabilities on a canvas and
compute answers about player populations over time.

- **URL**: `<username>.github.io/markov-transitions`
- **Shape**: one long-form article with the interactive tool embedded inline.
- **Content**: article prose is scaffolded with placeholder blocks; the site
  owner writes the final text.

## Architecture

| Concern | Choice |
|---|---|
| Framework | React 18 + TypeScript + Vite |
| Canvas editor | React Flow (`@xyflow/react`) — drag/pan/zoom, custom state nodes, custom labeled edges |
| Math engine | Hand-written linear algebra module (no external math dependency) |
| Persistence | `localStorage` autosave + built-in presets |
| Testing | Vitest for the math engine |
| Hosting | GitHub Pages via GitHub Actions on push to `main`; Vite `base: '/markov-transitions/'` |

## Data model

```ts
interface State      { id: string; name: string; position: { x: number; y: number } }
interface Transition { id: string; from: string; to: string; probability: number }  // from === to allowed
interface Chain      { id: string; name: string; states: State[]; transitions: Transition[] }
```

A state's outgoing row of the transition matrix is derived from its
transitions. Missing pairs are implicitly probability 0.

### Validation

Every state's outgoing probabilities must sum to 1 (tolerance 1e-9).
Offending states are flagged on the canvas (red outline + current sum) and all
calculators are disabled until the whole chain is valid. No silent
normalization.

### Chain-type detection

- A state is **absorbing** iff its only outgoing transition is a self-loop
  with probability 1.
- Chain has ≥1 absorbing state → **absorbing-chain calculators** are shown.
- Chain has none → **steady-state calculator** is shown.
- The UI explains why one group or the other is active (a steady-state vector
  over an absorbing chain degenerates onto the absorbing states, so showing
  both is misleading).

## Calculators

1. **Diagnostics** (always on) — per-state table: stickiness (self-loop
   probability), top outbound transition, direct drop-off probability into a
   user-designated "risk" state (e.g. Churned). Flags sticky vs leaky states.
2. **N-step forecast** (always on) — choose a start (single state or custom
   distribution) and N steps; shows the resulting distribution as a bar
   chart. Computed by repeated vector–matrix multiplication.
3. **Absorption analysis** (absorbing chains) — from any start state:
   probability of ending in each absorbing state, and expected number of
   steps until absorption. Computed via the fundamental matrix
   `N = (I − Q)⁻¹`, absorption probabilities `B = N·R`, expected steps
   `t = N·1`.
4. **Steady state** (non-absorbing chains) — stationary distribution via
   power iteration with convergence check; warns when the chain is not
   irreducible (no unique stationary distribution).

## Math module

Small, dependency-free, unit-tested:

- matrix × matrix, vector × matrix
- Gauss–Jordan inversion
- fundamental-matrix pipeline (Q/R extraction, N, B, t)
- power iteration with convergence + irreducibility check (reachability via
  BFS on the transition graph)

Tests use hand-verified textbook examples (e.g. gambler's ruin, simple
2-state weather chain) plus the two shipped presets.

## Canvas UX (React Flow)

- Click empty canvas → create a state (auto-named, inline rename).
- Drag from a node's handle to another node → create a transition; a default
  probability is filled in and immediately editable.
- Click an edge's probability label → edit in place.
- Self-loops rendered as an arc on the node.
- Select + `Delete`/`Backspace` or a toolbar button removes nodes/edges.
- Node positions persist as part of the chain.

## Presets

1. **Player funnel with churn** — Tutorial → Leveling → Endgame; Churned is
   absorbing. Demonstrates drop-off, absorption probability ("does a player
   ever reach Endgame?"), expected time to churn.
2. **Win-back loop** — same chain but Churned → Returning → Leveling; no
   absorbing state. Demonstrates the steady-state equilibrium mix.

Selecting a preset replaces the current chain (with confirmation if the
current chain has unsaved edits beyond the preset). Current chain autosaves
to `localStorage` on every change; a reset button restores the selected
preset.

## Page layout

Single page, article-style, in reading order:

1. Title + intro *(placeholder)*
2. "States and transitions" *(placeholder)*
3. "The transition matrix" *(placeholder)*
4. **The tool** — full-width embed: preset picker · canvas · validation
   status · calculators panel
5. "Absorbing states: modeling churn" *(placeholder)*
6. "Steady state: modeling win-back" *(placeholder)*
7. Closing notes *(placeholder)*

Placeholders are clearly marked blocks with suggested headings so the owner
can replace them with prose.

## Deployment

- Public GitHub repo `markov-transitions` (created with `gh`, confirmed with
  the user before creation/push).
- GitHub Actions workflow: on push to `main`, `npm ci && npm run build`,
  upload `dist/`, deploy to GitHub Pages.
- Pages source set to "GitHub Actions".

## Out of scope (YAGNI)

- Multi-post blog engine, Markdown pipeline
- Shareable URLs, JSON import/export
- Backend of any kind
- Continuous-time chains, rewards, hidden Markov models
- Mobile-optimized canvas editing (page renders on mobile; editing is
  desktop-first)

## Verification

- Vitest suite for the math module passes.
- Manual browser run-through: build both presets from scratch on the canvas,
  confirm each calculator against hand-computed values, confirm validation
  blocking, confirm localStorage persistence across reload.
- Post-deploy: confirm the live Pages URL serves the site with correct asset
  paths.
