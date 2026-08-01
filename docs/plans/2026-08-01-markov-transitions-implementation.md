# Markov Transitions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build and deploy a GitHub Pages site — a long-form article scaffold with an embedded interactive Markov-chain editor (React Flow canvas) and calculators for player-lifecycle questions (diagnostics, N-step forecast, absorption, steady state).

**Architecture:** React + TypeScript + Vite single-page app. A pure, dependency-free math library (`src/lib/`) is developed TDD-first with Vitest; the chain lives in a reducer (single source of truth) with debounced localStorage persistence; React Flow renders a fully controlled canvas derived from the chain. GitHub Actions builds and deploys `dist/` to Pages.

**Tech Stack:** React 19, TypeScript, Vite, `@xyflow/react` (React Flow v12), Vitest. No other runtime dependencies.

**Design doc:** `docs/plans/2026-08-01-markov-transitions-design.md`

**Verified fixture values:** All expected test values below (drunkard's walk N/t/B, weather steady state, preset expected-steps and steady-state vectors) were verified numerically before writing this plan. They are exact (fractions noted inline).

---

## Task 1: Scaffold the Vite project

**Files:**
- Create: entire Vite scaffold at repo root (`package.json`, `vite.config.ts`, `src/`, `index.html`, ...)
- Modify: `vite.config.ts` (Pages base path, Vitest config)

**Step 1: Scaffold into a temp dir and merge into repo root** (root already contains `docs/` and `.git/`)

```bash
cd /Users/ugurkoc/repos/markov-transitions
npm create vite@latest tmp-scaffold -- --template react-ts
rsync -a tmp-scaffold/ ./ && rm -rf tmp-scaffold
npm install
npm install @xyflow/react
npm install -D vitest
```

**Step 2: Configure Vite for GitHub Pages + Vitest**

Replace `vite.config.ts`:

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/markov-transitions/',
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
```

Add to `package.json` scripts: `"test": "vitest run"`.

**Step 3: Verify dev server and build work**

Run: `npm run build` — expect a `dist/` with hashed assets referencing `/markov-transitions/`.
Run: `npm run test` — expect "No test files found" (exit code may be non-zero; that's fine until Task 2) — or add `--passWithNoTests`.

**Step 4: Clean out scaffold demo content**

Replace `src/App.tsx` with a minimal placeholder (`<h1>Markov Transitions</h1>`), delete `src/App.css` contents (keep file), empty `src/assets/`, simplify `src/index.css` to a bare reset. Set `<title>` in `index.html` to `Player Lifecycles as Markov Chains`.

**Step 5: Commit**

```bash
git add -A && git commit -m "Scaffold Vite + React + TS project with React Flow and Vitest"
```

---

## Task 2: Linear algebra module (TDD)

**Files:**
- Create: `src/lib/linalg.ts`
- Test: `src/lib/linalg.test.ts`

**Step 1: Write failing tests**

```ts
import { describe, it, expect } from 'vitest'
import { identity, matMul, vecMat, invert } from './linalg'

describe('identity', () => {
  it('builds an n×n identity', () => {
    expect(identity(2)).toEqual([[1, 0], [0, 1]])
  })
})

describe('matMul', () => {
  it('multiplies two matrices', () => {
    expect(matMul([[1, 2], [3, 4]], [[5, 6], [7, 8]])).toEqual([[19, 22], [43, 50]])
  })
})

describe('vecMat', () => {
  it('multiplies row vector by matrix', () => {
    expect(vecMat([1, 0], [[0.9, 0.1], [0.5, 0.5]])).toEqual([0.9, 0.1])
  })
})

describe('invert', () => {
  it('inverts a 2×2 matrix (Gauss-Jordan)', () => {
    const inv = invert([[2, 1], [1, 1]])
    expect(inv[0][0]).toBeCloseTo(1, 12)
    expect(inv[0][1]).toBeCloseTo(-1, 12)
    expect(inv[1][0]).toBeCloseTo(-1, 12)
    expect(inv[1][1]).toBeCloseTo(2, 12)
  })
  it('A · A⁻¹ = I for a 3×3', () => {
    const A = [[2, 0, 1], [1, 3, 0], [0, 1, 4]]
    const prod = matMul(A, invert(A))
    const I = identity(3)
    prod.forEach((row, i) => row.forEach((x, j) => expect(x).toBeCloseTo(I[i][j], 10)))
  })
  it('throws on a singular matrix', () => {
    expect(() => invert([[1, 2], [2, 4]])).toThrow()
  })
})
```

**Step 2: Run to verify failure** — `npm run test` → FAIL (module not found).

**Step 3: Implement `src/lib/linalg.ts`**

```ts
export type Matrix = number[][]
export type Vector = number[]

export function identity(n: number): Matrix {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  )
}

export function matMul(a: Matrix, b: Matrix): Matrix {
  const n = a.length
  const k = b.length
  const m = b[0].length
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: m }, (_, j) => {
      let s = 0
      for (let x = 0; x < k; x++) s += a[i][x] * b[x][j]
      return s
    }),
  )
}

export function vecMat(v: Vector, p: Matrix): Vector {
  return p[0].map((_, j) => v.reduce((s, vi, i) => s + vi * p[i][j], 0))
}

/** Gauss–Jordan inversion with partial pivoting. Throws on singular input. */
export function invert(m: Matrix): Matrix {
  const n = m.length
  const a = m.map((row, i) => [...row, ...identity(n)[i]])
  for (let col = 0; col < n; col++) {
    let piv = col
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(a[r][col]) > Math.abs(a[piv][col])) piv = r
    }
    if (Math.abs(a[piv][col]) < 1e-12) throw new Error('Matrix is singular')
    ;[a[col], a[piv]] = [a[piv], a[col]]
    const p = a[col][col]
    for (let j = 0; j < 2 * n; j++) a[col][j] /= p
    for (let r = 0; r < n; r++) {
      if (r === col) continue
      const f = a[r][col]
      for (let j = 0; j < 2 * n; j++) a[r][j] -= f * a[col][j]
    }
  }
  return a.map((row) => row.slice(n))
}
```

**Step 4: Run tests** — all pass.

**Step 5: Commit** — `git add src/lib && git commit -m "Add linear algebra module"`

---

## Task 3: Chain types, matrix building, validation, structure detection (TDD)

**Files:**
- Create: `src/lib/types.ts`, `src/lib/chain.ts`
- Test: `src/lib/chain.test.ts`

**Step 1: Create `src/lib/types.ts`** (no test needed — types only)

```ts
export interface StateNode {
  id: string
  name: string
  position: { x: number; y: number }
}

export interface Transition {
  id: string
  from: string
  to: string
  probability: number
}

export interface Chain {
  id: string
  name: string
  states: StateNode[]
  transitions: Transition[]
}
```

**Step 2: Write failing tests for `chain.ts`**

Test fixtures use a tiny helper to build chains tersely. Cover:

```ts
import { describe, it, expect } from 'vitest'
import type { Chain } from './types'
import { buildMatrix, validateChain, absorbingStateIds, closedClasses } from './chain'

function mkChain(names: string[], rows: Record<string, Record<string, number>>): Chain {
  const states = names.map((name) => ({ id: name, name, position: { x: 0, y: 0 } }))
  const transitions = Object.entries(rows).flatMap(([from, tos]) =>
    Object.entries(tos).map(([to, probability]) => ({
      id: `${from}->${to}`, from, to, probability,
    })),
  )
  return { id: 'test', name: 'test', states, transitions }
}

describe('buildMatrix', () => {
  it('builds a row-stochastic matrix in state order, missing pairs are 0', () => {
    const c = mkChain(['A', 'B'], { A: { A: 0.9, B: 0.1 }, B: { A: 0.5, B: 0.5 } })
    expect(buildMatrix(c)).toEqual([[0.9, 0.1], [0.5, 0.5]])
  })
})

describe('validateChain', () => {
  it('accepts rows summing to 1', () => {
    const c = mkChain(['A', 'B'], { A: { A: 0.9, B: 0.1 }, B: { A: 0.5, B: 0.5 } })
    expect(validateChain(c).valid).toBe(true)
  })
  it('flags a row summing to 0.8 with its sum', () => {
    const c = mkChain(['A', 'B'], { A: { A: 0.3, B: 0.5 }, B: { B: 1 } })
    const v = validateChain(c)
    expect(v.valid).toBe(false)
    expect(v.rowSums['A']).toBeCloseTo(0.8, 12)
    expect(v.invalidStateIds).toEqual(['A'])
  })
  it('flags a state with no outgoing transitions (sum 0)', () => {
    const c = mkChain(['A', 'B'], { A: { B: 1 } })
    expect(validateChain(c).invalidStateIds).toEqual(['B'])
  })
  it('an empty chain is valid (nothing to compute yet)', () => {
    expect(validateChain(mkChain([], {})).valid).toBe(true)
  })
})

describe('absorbingStateIds', () => {
  it('detects a self-loop-1 state', () => {
    const c = mkChain(['A', 'B'], { A: { A: 0.5, B: 0.5 }, B: { B: 1 } })
    expect(absorbingStateIds(c)).toEqual(['B'])
  })
  it('a state with self-loop 1 plus another 0-prob transition is still absorbing', () => {
    const c = mkChain(['A', 'B'], { A: { A: 1, B: 0 }, B: { B: 1 } })
    expect(absorbingStateIds(c)).toEqual(['A', 'B'])
  })
})

describe('closedClasses', () => {
  it('one closed class in an irreducible chain', () => {
    const c = mkChain(['A', 'B'], { A: { A: 0.9, B: 0.1 }, B: { A: 0.5, B: 0.5 } })
    expect(closedClasses(c)).toHaveLength(1)
  })
  it('transient state feeding one recurrent class → one closed class', () => {
    // A → B, B ↔ B (A never revisited)
    const c = mkChain(['A', 'B'], { A: { A: 0.5, B: 0.5 }, B: { B: 1 } })
    expect(closedClasses(c)).toHaveLength(1)
  })
  it('two absorbing states → two closed classes', () => {
    const c = mkChain(['A', 'B', 'C'], { A: { B: 0.5, C: 0.5 }, B: { B: 1 }, C: { C: 1 } })
    expect(closedClasses(c)).toHaveLength(2)
  })
})
```

**Step 3: Run to verify failure.**

**Step 4: Implement `src/lib/chain.ts`**

```ts
import type { Chain } from './types'
import type { Matrix } from './linalg'

export const PROB_TOLERANCE = 1e-9

export interface ValidationResult {
  valid: boolean
  rowSums: Record<string, number>
  invalidStateIds: string[]
}

/** Row-stochastic matrix in chain.states order; absent transitions are 0. */
export function buildMatrix(chain: Chain): Matrix {
  const index = new Map(chain.states.map((s, i) => [s.id, i]))
  const n = chain.states.length
  const m: Matrix = Array.from({ length: n }, () => Array(n).fill(0))
  for (const t of chain.transitions) {
    const i = index.get(t.from)
    const j = index.get(t.to)
    if (i === undefined || j === undefined) continue
    m[i][j] += t.probability
  }
  return m
}

export function validateChain(chain: Chain): ValidationResult {
  const m = buildMatrix(chain)
  const rowSums: Record<string, number> = {}
  const invalidStateIds: string[] = []
  chain.states.forEach((s, i) => {
    const sum = m[i].reduce((a, b) => a + b, 0)
    rowSums[s.id] = sum
    if (Math.abs(sum - 1) > PROB_TOLERANCE) invalidStateIds.push(s.id)
  })
  return { valid: invalidStateIds.length === 0, rowSums, invalidStateIds }
}

/** Absorbing = all outgoing probability mass on the self-loop (sum 1). */
export function absorbingStateIds(chain: Chain): string[] {
  const m = buildMatrix(chain)
  return chain.states
    .filter((s, i) => Math.abs(m[i][i] - 1) <= PROB_TOLERANCE &&
      m[i].every((p, j) => j === chain.states.findIndex(x => x.id === s.id) || p <= PROB_TOLERANCE))
    .map((s) => s.id)
}

/**
 * Closed communicating classes (recurrent classes), via mutual reachability.
 * Exactly one closed class ⇒ unique stationary distribution.
 */
export function closedClasses(chain: Chain): string[][] {
  const n = chain.states.length
  const m = buildMatrix(chain)
  // reach[i] = set of j reachable from i (including i)
  const reach: boolean[][] = Array.from({ length: n }, (_, i) => {
    const seen = Array(n).fill(false)
    const stack = [i]
    seen[i] = true
    while (stack.length) {
      const cur = stack.pop()!
      m[cur].forEach((p, j) => {
        if (p > PROB_TOLERANCE && !seen[j]) { seen[j] = true; stack.push(j) }
      })
    }
    return seen
  })
  const classes: string[][] = []
  const assigned = Array(n).fill(false)
  for (let i = 0; i < n; i++) {
    if (assigned[i]) continue
    const cls = []
    for (let j = 0; j < n; j++) {
      if (reach[i][j] && reach[j][i]) cls.push(j)
    }
    // closed iff nothing outside the class is reachable from it
    const closed = cls.every((j) => m[j].every((p, k) => p <= PROB_TOLERANCE || cls.includes(k)))
    cls.forEach((j) => { assigned[j] = true })
    if (closed) classes.push(cls.map((j) => chain.states[j].id))
  }
  return classes
}
```

Note: in `absorbingStateIds`, precompute the state's own index rather than `findIndex` inside `every` (implementer: use the enumerate index `i` — the filter callback's second argument — for the self-comparison; the code above shows intent, write it cleanly).

**Step 5: Run tests** — all pass. **Step 6: Commit** — `"Add chain model: matrix building, validation, structure detection"`

---

## Task 4: Analysis — N-step forecast (TDD)

**Files:**
- Create: `src/lib/analysis.ts`
- Test: `src/lib/analysis.test.ts`

**Step 1: Failing test**

```ts
import { describe, it, expect } from 'vitest'
import { nStepForecast } from './analysis'

const weather = [[0.9, 0.1], [0.5, 0.5]]

describe('nStepForecast', () => {
  it('returns distributions for steps 0..N', () => {
    const steps = nStepForecast(weather, [1, 0], 2)
    expect(steps).toHaveLength(3)
    expect(steps[0]).toEqual([1, 0])
    expect(steps[1][0]).toBeCloseTo(0.9, 12)
    expect(steps[2][0]).toBeCloseTo(0.86, 12) // 0.9·0.9 + 0.1·0.5
    expect(steps[2][1]).toBeCloseTo(0.14, 12)
  })
})
```

**Step 2: Verify failure. Step 3: Implement:**

```ts
import { vecMat, invert, identity, matMul } from './linalg'
import type { Matrix, Vector } from './linalg'

/** Distributions after 0..n steps, starting from `start`. */
export function nStepForecast(p: Matrix, start: Vector, n: number): Vector[] {
  const out = [start]
  let v = start
  for (let i = 0; i < n; i++) {
    v = vecMat(v, p)
    out.push(v)
  }
  return out
}
```

**Step 4: Pass. Step 5: Commit** — `"Add N-step forecast"`

---

## Task 5: Analysis — absorption (fundamental matrix) (TDD)

**Files:**
- Modify: `src/lib/analysis.ts`
- Test: `src/lib/analysis.test.ts`

**Step 1: Failing tests** (drunkard's walk on 0–3, p=½, both ends absorbing — all values exact):

```ts
import { absorptionAnalysis } from './analysis'

// States: s0 (absorbing), s1, s2, s3 (absorbing); p=0.5 each direction.
// Matrix order: s0, s1, s2, s3.
const drunkard = [
  [1, 0, 0, 0],
  [0.5, 0, 0.5, 0],
  [0, 0.5, 0, 0.5],
  [0, 0, 0, 1],
]

describe('absorptionAnalysis', () => {
  const r = absorptionAnalysis(drunkard, [0, 3]) // absorbing indices
  it('computes absorption probabilities B = N·R', () => {
    // from s1: P(absorb at s0) = 2/3, P(absorb at s3) = 1/3
    expect(r.absorptionProbs[1][0]).toBeCloseTo(2 / 3, 12)
    expect(r.absorptionProbs[1][3]).toBeCloseTo(1 / 3, 12)
    expect(r.absorptionProbs[2][0]).toBeCloseTo(1 / 3, 12)
    expect(r.absorptionProbs[2][3]).toBeCloseTo(2 / 3, 12)
  })
  it('computes expected steps to absorption t = N·1', () => {
    expect(r.expectedSteps[1]).toBeCloseTo(2, 12)
    expect(r.expectedSteps[2]).toBeCloseTo(2, 12)
  })
  it('absorbing states absorb at themselves in 0 steps', () => {
    expect(r.absorptionProbs[0][0]).toBe(1)
    expect(r.expectedSteps[0]).toBe(0)
  })
})
```

**Step 2: Verify failure. Step 3: Implement** (append to `analysis.ts`):

```ts
export interface AbsorptionResult {
  /** absorptionProbs[i][j] = P(eventually absorbed at state j | start at i). 0 for non-absorbing j. */
  absorptionProbs: number[][]
  /** expectedSteps[i] = expected steps until absorption starting from i. */
  expectedSteps: number[]
}

export function absorptionAnalysis(p: Matrix, absorbingIdx: number[]): AbsorptionResult {
  const n = p.length
  const absorbing = new Set(absorbingIdx)
  const transient = Array.from({ length: n }, (_, i) => i).filter((i) => !absorbing.has(i))
  const q = transient.map((i) => transient.map((j) => p[i][j]))
  const r = transient.map((i) => absorbingIdx.map((j) => p[i][j]))
  const nMat = invert(identity(transient.length).map((row, i) => row.map((x, j) => x - q[i][j])))
  const b = matMul(nMat, r)
  const absorptionProbs = Array.from({ length: n }, () => Array(n).fill(0))
  const expectedSteps = Array(n).fill(0)
  absorbingIdx.forEach((i) => { absorptionProbs[i][i] = 1 })
  transient.forEach((ti, x) => {
    absorbingIdx.forEach((aj, y) => { absorptionProbs[ti][aj] = b[x][y] })
    expectedSteps[ti] = nMat[x].reduce((a, v) => a + v, 0)
  })
  return { absorptionProbs, expectedSteps }
}
```

Edge case to handle (add a test): if a transient state cannot reach any absorbing state (e.g. a separate closed cycle), `I − Q` is singular → catch and rethrow as `Error('Some states can never reach an absorbing state')`. The UI shows this message.

**Step 4: Pass. Step 5: Commit** — `"Add absorption analysis via fundamental matrix"`

---

## Task 6: Analysis — steady state via power iteration (TDD)

**Files:**
- Modify: `src/lib/analysis.ts`
- Test: `src/lib/analysis.test.ts`

**Step 1: Failing tests:**

```ts
import { steadyState } from './analysis'

describe('steadyState', () => {
  it('weather chain converges to [5/6, 1/6]', () => {
    const r = steadyState([[0.9, 0.1], [0.5, 0.5]])
    expect(r.converged).toBe(true)
    expect(r.distribution[0]).toBeCloseTo(5 / 6, 8)
    expect(r.distribution[1]).toBeCloseTo(1 / 6, 8)
  })
  it('handles a periodic chain via lazy-chain damping (A↔B → [1/2, 1/2])', () => {
    const r = steadyState([[0, 1], [1, 0]])
    expect(r.converged).toBe(true)
    expect(r.distribution[0]).toBeCloseTo(0.5, 8)
  })
})
```

**Step 2: Verify failure. Step 3: Implement:**

```ts
export interface SteadyStateResult {
  distribution: Vector
  converged: boolean
}

/**
 * Stationary distribution by power iteration on the lazy chain (P+I)/2,
 * which has the same stationary distribution and is always aperiodic.
 */
export function steadyState(p: Matrix, maxIter = 100_000, tol = 1e-12): SteadyStateResult {
  const n = p.length
  const lazy = p.map((row, i) => row.map((x, j) => (x + (i === j ? 1 : 0)) / 2))
  let v: Vector = Array(n).fill(1 / n)
  for (let it = 0; it < maxIter; it++) {
    const nv = vecMat(v, lazy)
    const diff = nv.reduce((s, x, i) => s + Math.abs(x - v[i]), 0)
    v = nv
    if (diff < tol) return { distribution: v, converged: true }
  }
  return { distribution: v, converged: false }
}
```

Uniqueness is *not* this function's job — the UI calls `closedClasses(chain)` and warns when there are ≥2 (distribution then depends on the start; the returned vector is just the uniform-start limit).

**Step 4: Pass. Step 5: Commit** — `"Add steady-state analysis"`

---

## Task 7: Analysis — diagnostics (TDD)

**Files:**
- Modify: `src/lib/analysis.ts`
- Test: `src/lib/analysis.test.ts`

**Step 1: Failing test:**

```ts
import { diagnostics } from './analysis'
// mkChain helper: import from a shared test util or redefine locally

describe('diagnostics', () => {
  const c = mkChain(['T', 'L', 'C'], {
    T: { T: 0.5, L: 0.3, C: 0.2 },
    L: { L: 0.6, T: 0.25, C: 0.15 },
    C: { C: 1 },
  })
  it('reports stickiness (self-loop), top outbound, and drop-off to the risk state', () => {
    const d = diagnostics(c, 'C')
    const t = d.find((row) => row.stateId === 'T')!
    expect(t.stickiness).toBeCloseTo(0.5, 12)
    expect(t.topOutbound).toEqual({ toId: 'L', probability: 0.3 })
    expect(t.dropOff).toBeCloseTo(0.2, 12)
  })
  it('risk state omitted → dropOff is null', () => {
    expect(diagnostics(c, null)[0].dropOff).toBeNull()
  })
})
```

**Step 2: Verify failure. Step 3: Implement:**

```ts
import type { Chain } from './types'
import { buildMatrix } from './chain'

export interface DiagnosticsRow {
  stateId: string
  stickiness: number
  topOutbound: { toId: string; probability: number } | null
  dropOff: number | null
}

export function diagnostics(chain: Chain, riskStateId: string | null): DiagnosticsRow[] {
  const m = buildMatrix(chain)
  const riskIdx = riskStateId ? chain.states.findIndex((s) => s.id === riskStateId) : -1
  return chain.states.map((s, i) => {
    let top: DiagnosticsRow['topOutbound'] = null
    m[i].forEach((prob, j) => {
      if (j !== i && prob > 0 && (!top || prob > top.probability)) {
        top = { toId: chain.states[j].id, probability: prob }
      }
    })
    return {
      stateId: s.id,
      stickiness: m[i][i],
      topOutbound: top,
      dropOff: riskIdx >= 0 ? m[i][riskIdx] : null,
    }
  })
}
```

**Step 4: Pass. Step 5: Commit** — `"Add per-state diagnostics"`

---

## Task 8: Presets (TDD against verified end-to-end values)

**Files:**
- Create: `src/lib/presets.ts`
- Test: `src/lib/presets.test.ts`

**Step 1: Failing tests** (these pin the whole math pipeline to exact, pre-verified values):

```ts
import { describe, it, expect } from 'vitest'
import { funnelPreset, winBackPreset } from './presets'
import { validateChain, absorbingStateIds, closedClasses, buildMatrix } from './chain'
import { absorptionAnalysis, steadyState } from './analysis'

describe('funnel preset (Tutorial/Leveling/Endgame/Churned, Churned absorbing)', () => {
  it('is valid and has exactly Churned absorbing', () => {
    expect(validateChain(funnelPreset).valid).toBe(true)
    expect(absorbingStateIds(funnelPreset)).toEqual(['churned'])
  })
  it('expected steps to churn: Tutorial 6, Leveling 20/3, Endgame 20/3', () => {
    const p = buildMatrix(funnelPreset)
    const idx = funnelPreset.states.findIndex((s) => s.id === 'churned')
    const r = absorptionAnalysis(p, [idx])
    const at = (id: string) => funnelPreset.states.findIndex((s) => s.id === id)
    expect(r.expectedSteps[at('tutorial')]).toBeCloseTo(6, 10)
    expect(r.expectedSteps[at('leveling')]).toBeCloseTo(20 / 3, 10)
    expect(r.expectedSteps[at('endgame')]).toBeCloseTo(20 / 3, 10)
  })
})

describe('win-back preset (adds Returning, no absorbing states)', () => {
  it('is valid, has no absorbing states, one closed class', () => {
    expect(validateChain(winBackPreset).valid).toBe(true)
    expect(absorbingStateIds(winBackPreset)).toEqual([])
    expect(closedClasses(winBackPreset)).toHaveLength(1)
  })
  it('steady state: [0, 21/128, 35/128, 60/128, 12/128] in T/L/E/C/R order', () => {
    const r = steadyState(buildMatrix(winBackPreset))
    expect(r.converged).toBe(true)
    const expected = [0, 21 / 128, 35 / 128, 60 / 128, 12 / 128]
    r.distribution.forEach((x, i) => expect(x).toBeCloseTo(expected[i], 6))
  })
})
```

**Step 2: Verify failure. Step 3: Implement `src/lib/presets.ts`:**

```ts
import type { Chain } from './types'

// Weekly-cadence player lifecycle. Probabilities are per-week transition rates.
export const funnelPreset: Chain = {
  id: 'preset-funnel',
  name: 'Player funnel with churn',
  states: [
    { id: 'tutorial', name: 'Tutorial', position: { x: 0, y: 150 } },
    { id: 'leveling', name: 'Leveling', position: { x: 260, y: 60 } },
    { id: 'endgame', name: 'Endgame', position: { x: 520, y: 60 } },
    { id: 'churned', name: 'Churned', position: { x: 320, y: 280 } },
  ],
  transitions: [
    { id: 't-t', from: 'tutorial', to: 'tutorial', probability: 0.5 },
    { id: 't-l', from: 'tutorial', to: 'leveling', probability: 0.3 },
    { id: 't-c', from: 'tutorial', to: 'churned', probability: 0.2 },
    { id: 'l-l', from: 'leveling', to: 'leveling', probability: 0.6 },
    { id: 'l-e', from: 'leveling', to: 'endgame', probability: 0.25 },
    { id: 'l-c', from: 'leveling', to: 'churned', probability: 0.15 },
    { id: 'e-e', from: 'endgame', to: 'endgame', probability: 0.85 },
    { id: 'e-c', from: 'endgame', to: 'churned', probability: 0.15 },
    { id: 'c-c', from: 'churned', to: 'churned', probability: 1 },
  ],
}

export const winBackPreset: Chain = {
  id: 'preset-winback',
  name: 'Win-back loop',
  states: [
    { id: 'tutorial', name: 'Tutorial', position: { x: 0, y: 150 } },
    { id: 'leveling', name: 'Leveling', position: { x: 260, y: 60 } },
    { id: 'endgame', name: 'Endgame', position: { x: 520, y: 60 } },
    { id: 'churned', name: 'Churned', position: { x: 320, y: 280 } },
    { id: 'returning', name: 'Returning', position: { x: 80, y: 320 } },
  ],
  transitions: [
    { id: 't-t', from: 'tutorial', to: 'tutorial', probability: 0.5 },
    { id: 't-l', from: 'tutorial', to: 'leveling', probability: 0.3 },
    { id: 't-c', from: 'tutorial', to: 'churned', probability: 0.2 },
    { id: 'l-l', from: 'leveling', to: 'leveling', probability: 0.6 },
    { id: 'l-e', from: 'leveling', to: 'endgame', probability: 0.25 },
    { id: 'l-c', from: 'leveling', to: 'churned', probability: 0.15 },
    { id: 'e-e', from: 'endgame', to: 'endgame', probability: 0.85 },
    { id: 'e-c', from: 'endgame', to: 'churned', probability: 0.15 },
    { id: 'c-c', from: 'churned', to: 'churned', probability: 0.8 },
    { id: 'c-r', from: 'churned', to: 'returning', probability: 0.2 },
    { id: 'r-l', from: 'returning', to: 'leveling', probability: 0.7 },
    { id: 'r-c', from: 'returning', to: 'churned', probability: 0.3 },
  ],
}

export const presets = [funnelPreset, winBackPreset]
```

**Step 4: Pass. Step 5: Commit** — `"Add lifecycle presets pinned to exact analysis values"`

---

## Task 9: Chain reducer + localStorage persistence (TDD on the reducer)

**Files:**
- Create: `src/state/chainReducer.ts`, `src/state/useChain.ts`
- Test: `src/state/chainReducer.test.ts`

**Step 1: Failing tests for the pure reducer:**

```ts
import { describe, it, expect } from 'vitest'
import { chainReducer } from './chainReducer'
import { funnelPreset } from '../lib/presets'

const empty = { id: 'c', name: 'My chain', states: [], transitions: [] }

describe('chainReducer', () => {
  it('addState creates an auto-named state at the given position', () => {
    const c = chainReducer(empty, { type: 'addState', position: { x: 10, y: 20 } })
    expect(c.states).toHaveLength(1)
    expect(c.states[0].name).toBe('State 1')
    expect(c.states[0].position).toEqual({ x: 10, y: 20 })
  })
  it('addTransition defaults probability to the remaining row mass', () => {
    let c = chainReducer(empty, { type: 'addState', position: { x: 0, y: 0 } })
    c = chainReducer(c, { type: 'addState', position: { x: 100, y: 0 } })
    const [a, b] = c.states
    c = chainReducer(c, { type: 'addTransition', from: a.id, to: a.id }) // self-loop → 1
    expect(c.transitions[0].probability, 'first gets full mass').toBe(1)
    c = chainReducer(c, { type: 'setProbability', id: c.transitions[0].id, probability: 0.6 })
    c = chainReducer(c, { type: 'addTransition', from: a.id, to: b.id }) // remainder → 0.4
    expect(c.transitions[1].probability).toBeCloseTo(0.4, 12)
  })
  it('addTransition is a no-op when the pair already exists', () => {
    let c = funnelPreset
    const before = c.transitions.length
    c = chainReducer(c, { type: 'addTransition', from: 'tutorial', to: 'leveling' })
    expect(c.transitions).toHaveLength(before)
  })
  it('deleteState removes the state and all transitions touching it', () => {
    const c = chainReducer(funnelPreset, { type: 'deleteState', id: 'leveling' })
    expect(c.states.map((s) => s.id)).not.toContain('leveling')
    expect(c.transitions.every((t) => t.from !== 'leveling' && t.to !== 'leveling')).toBe(true)
  })
  it('setProbability clamps to [0, 1]', () => {
    const c = chainReducer(funnelPreset, { type: 'setProbability', id: 't-l', probability: 1.5 })
    expect(c.transitions.find((t) => t.id === 't-l')!.probability).toBe(1)
  })
  it('renameState, moveState, deleteTransition, loadChain behave as expected', () => {
    let c = chainReducer(funnelPreset, { type: 'renameState', id: 'tutorial', name: 'Onboarding' })
    expect(c.states.find((s) => s.id === 'tutorial')!.name).toBe('Onboarding')
    c = chainReducer(c, { type: 'moveState', id: 'tutorial', position: { x: 5, y: 5 } })
    expect(c.states.find((s) => s.id === 'tutorial')!.position).toEqual({ x: 5, y: 5 })
    c = chainReducer(c, { type: 'deleteTransition', id: 't-l' })
    expect(c.transitions.find((t) => t.id === 't-l')).toBeUndefined()
    c = chainReducer(c, { type: 'loadChain', chain: funnelPreset })
    expect(c).toEqual(funnelPreset)
  })
})
```

**Step 2: Verify failure. Step 3: Implement `chainReducer.ts`:**

```ts
import type { Chain } from '../lib/types'
import { validateChain } from '../lib/chain'

export type ChainAction =
  | { type: 'addState'; position: { x: number; y: number } }
  | { type: 'renameState'; id: string; name: string }
  | { type: 'moveState'; id: string; position: { x: number; y: number } }
  | { type: 'deleteState'; id: string }
  | { type: 'addTransition'; from: string; to: string }
  | { type: 'setProbability'; id: string; probability: number }
  | { type: 'deleteTransition'; id: string }
  | { type: 'loadChain'; chain: Chain }

export function chainReducer(chain: Chain, action: ChainAction): Chain {
  switch (action.type) {
    case 'addState': {
      const n = chain.states.length + 1
      return {
        ...chain,
        states: [...chain.states, {
          id: crypto.randomUUID(),
          name: `State ${n}`,
          position: action.position,
        }],
      }
    }
    case 'renameState':
      return { ...chain, states: chain.states.map((s) => s.id === action.id ? { ...s, name: action.name } : s) }
    case 'moveState':
      return { ...chain, states: chain.states.map((s) => s.id === action.id ? { ...s, position: action.position } : s) }
    case 'deleteState':
      return {
        ...chain,
        states: chain.states.filter((s) => s.id !== action.id),
        transitions: chain.transitions.filter((t) => t.from !== action.id && t.to !== action.id),
      }
    case 'addTransition': {
      if (chain.transitions.some((t) => t.from === action.from && t.to === action.to)) return chain
      const rowSum = validateChain(chain).rowSums[action.from] ?? 0
      return {
        ...chain,
        transitions: [...chain.transitions, {
          id: crypto.randomUUID(),
          from: action.from,
          to: action.to,
          probability: Math.max(0, Math.min(1, 1 - rowSum)),
        }],
      }
    }
    case 'setProbability':
      return {
        ...chain,
        transitions: chain.transitions.map((t) =>
          t.id === action.id ? { ...t, probability: Math.max(0, Math.min(1, action.probability)) } : t),
      }
    case 'deleteTransition':
      return { ...chain, transitions: chain.transitions.filter((t) => t.id !== action.id) }
    case 'loadChain':
      return action.chain
  }
}
```

**Step 4: Implement `useChain.ts`** (thin hook, verified manually in the browser, no unit test):

```ts
import { useEffect, useReducer, useRef } from 'react'
import type { Chain } from '../lib/types'
import { chainReducer } from './chainReducer'
import { funnelPreset } from '../lib/presets'

const STORAGE_KEY = 'markov-transitions:chain'

function loadInitial(): Chain {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Chain
  } catch { /* corrupt storage → fall through to preset */ }
  return funnelPreset
}

export function useChain() {
  const [chain, dispatch] = useReducer(chainReducer, undefined, loadInitial)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chain))
    }, 300)
    return () => clearTimeout(timer.current)
  }, [chain])
  return { chain, dispatch }
}
```

**Step 5: Run tests, pass. Step 6: Commit** — `"Add chain reducer and persistence hook"`

---

## Task 10: Canvas — React Flow integration

**Files:**
- Create: `src/components/StateNode.tsx`, `src/components/TransitionEdge.tsx`, `src/components/ChainCanvas.tsx`
- Modify: `src/App.tsx` (mount canvas for manual verification)

No unit tests for this task (browser-interaction code); verified manually in Task 14. Keep all logic that *can* be pure in the already-tested modules.

**Step 1: `StateNode.tsx`** — custom node: displays name; double-click → inline rename input; red outline + row-sum badge when invalid. Node `data`: `{ name: string; invalid: boolean; rowSum: number; onRename: (name: string) => void }`.

```tsx
import { useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'

export function StateNode({ data }: NodeProps) {
  const d = data as { name: string; invalid: boolean; rowSum: number; onRename: (n: string) => void }
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(d.name)
  const commit = () => { setEditing(false); if (draft.trim()) d.onRename(draft.trim()) }
  return (
    <div className={`state-node${d.invalid ? ' invalid' : ''}`} onDoubleClick={() => { setDraft(d.name); setEditing(true) }}>
      <Handle type="target" position={Position.Top} />
      {editing ? (
        <input
          className="nodrag"
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        />
      ) : (
        <span>{d.name}</span>
      )}
      {d.invalid && <div className="row-sum-badge">Σ = {d.rowSum.toFixed(2)}</div>}
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}
```

**Step 2: `TransitionEdge.tsx`** — custom edge: bezier for normal edges, arc for self-loops (source === target); probability label via `EdgeLabelRenderer`, click → inline number input. Edge `data`: `{ probability: number; isSelfLoop: boolean; onSetProbability: (p: number) => void }`.

```tsx
import { useState } from 'react'
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/react'
import type { EdgeProps } from '@xyflow/react'

export function TransitionEdge(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, markerEnd } = props
  const d = props.data as { probability: number; isSelfLoop: boolean; onSetProbability: (p: number) => void }
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(d.probability))

  let path: string, labelX: number, labelY: number
  if (d.isSelfLoop) {
    // Arc looping from the bottom handle around the node's right side to the top handle.
    const r = 42
    path = `M ${sourceX} ${sourceY} C ${sourceX + r * 2} ${sourceY + r}, ${targetX + r * 2} ${targetY - r}, ${targetX} ${targetY}`
    labelX = sourceX + r * 1.9
    labelY = (sourceY + targetY) / 2
  } else {
    ;[path, labelX, labelY] = getBezierPath(props)
  }

  const commit = () => {
    setEditing(false)
    const p = parseFloat(draft)
    if (!Number.isNaN(p)) d.onSetProbability(p)
  }

  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} />
      <EdgeLabelRenderer>
        <div
          className="edge-label nodrag nopan"
          style={{ position: 'absolute', pointerEvents: 'all', transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          onClick={() => { setDraft(String(d.probability)); setEditing(true) }}
        >
          {editing ? (
            <input
              autoFocus type="number" min={0} max={1} step={0.05} value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
            />
          ) : (
            <span>{d.probability}</span>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
```

**Step 3: `ChainCanvas.tsx`** — fully controlled flow derived from the chain; single source of truth is the reducer:

- `nodes = useMemo(...)`: map `chain.states` → RF nodes (`type: 'state'`, position from chain, `selected` from local `Set<string>` selection state, `data` carries name/invalid/rowSum/onRename).
- `edges = useMemo(...)`: map `chain.transitions` → RF edges (`type: 'transition'`, `markerEnd: { type: MarkerType.ArrowClosed }`, data carries probability/isSelfLoop/onSetProbability).
- `onNodesChange`: iterate changes — `position` → `dispatch(moveState)`; `select` → update local selection; `remove` → `dispatch(deleteState)`.
- `onEdgesChange`: `remove` → `dispatch(deleteTransition)`; `select` → local selection.
- `onConnect`: `dispatch(addTransition)`.
- Wrapper `<div onDoubleClick>`: if `(e.target as HTMLElement).closest('.react-flow__pane')`, add a state at `screenToFlowPosition({ x: e.clientX, y: e.clientY })` (via `useReactFlow`; wrap component in `<ReactFlowProvider>`). Set `zoomOnDoubleClick={false}`.
- Toolbar row above the canvas: "+ Add state" button (adds at viewport center), preset `<select>` (dispatch `loadChain` after `confirm()` if current chain differs from both presets), "Reset to preset" button.
- Also render `<Background />` and `<Controls />`. Nodes need `connectable` handles: source handle bottom, target handle top (already in StateNode). Set `connectionMode="loose"` so a drag from source→same node's target creates self-loops.
- Register `nodeTypes = { state: StateNode }`, `edgeTypes = { transition: TransitionEdge }` at module scope (never inline in JSX — causes re-mounts).
- Canvas container: fixed height (~480px), full article width.

**Step 4: Mount in `App.tsx`** inside `<ReactFlowProvider>`, import `@xyflow/react/dist/style.css`. Run `npm run dev`, verify by hand: pane double-click adds a node; drag between handles connects; label click edits; Delete removes; presets load; refresh restores state (localStorage).

**Step 5: Commit** — `"Add React Flow canvas with editable states and transitions"`

---

## Task 11: Calculator panels

**Files:**
- Create: `src/components/panels/ValidationBanner.tsx`, `DiagnosticsPanel.tsx`, `ForecastPanel.tsx`, `AbsorptionPanel.tsx`, `SteadyStatePanel.tsx`, `CalculatorsSection.tsx`

> **For Claude:** Before writing `ForecastPanel`'s bar chart (and any other chart-like rendering here), load the @dataviz skill.

All panels are pure renderings of already-tested math — keep every computation in `src/lib/`, panels only call it. Shared prop: the current `Chain`. `CalculatorsSection` computes once per render:

```ts
const validation = validateChain(chain)
const absorbing = absorbingStateIds(chain)
const matrix = buildMatrix(chain)
```

**Step 1: `ValidationBanner`** — hidden when valid; otherwise a red banner: "Calculations are paused — these states' outgoing probabilities don't sum to 1:" followed by `Name (Σ = 0.80)` chips. When chain has no states: neutral hint "Double-click the canvas to add your first state, or load a preset."

**Step 2: `DiagnosticsPanel`** (always shown when valid) — risk-state `<select>` (default: first state whose name matches `/churn/i`, else "none") + table: State | Stickiness (self-loop %) | Top outbound (→ Name p) | Drop-off → risk (%). Percentages formatted `toFixed(1)`. Flag column: "sticky" when stickiness ≥ 0.7, "leaky" when dropOff ≥ 0.3 (thresholds as named constants).

**Step 3: `ForecastPanel`** (always shown when valid) — start `<select>` (each single state + "Custom mix" revealing one number input per state, normalized on Run… keep simpler: custom inputs must sum to 1 with the same validation styling), steps slider 1–52 (default 8, labeled "steps (e.g. weeks)"). Renders `nStepForecast(matrix, start, n)` final distribution as horizontal bars (plain divs, width = percentage, label = `Name 34.2%`). Follow @dataviz for colors/format.

**Step 4: `AbsorptionPanel`** — rendered only when `absorbing.length > 0`. Explains: "This chain has absorbing states (Churned) — showing absorption analysis. Long-run equilibrium isn't meaningful here because all probability eventually collects in absorbing states." Start-state `<select>`; shows: table of P(end up in each absorbing state) + "Expected steps until absorption: 6.0". Wrap `absorptionAnalysis` in try/catch → render the error message (unreachable-absorbing case from Task 5).

**Step 5: `SteadyStatePanel`** — rendered only when `absorbing.length === 0`. Explains why steady state is active. Shows stationary distribution as bars. When `closedClasses(chain).length > 1`, warning: "This chain has multiple closed groups — the long-run mix depends on where players start, so no single steady state exists." When `!converged`: "Did not converge." Transient states (≈0) still listed.

**Step 6: `CalculatorsSection`** composes: ValidationBanner, then (only when valid and states exist) Diagnostics + Forecast + (Absorption | SteadyState). Mount below the canvas in `App.tsx`. Manual browser check with both presets: funnel shows Absorption (Tutorial → expected steps 6.0), win-back shows SteadyState (~46.9% Churned).

**Step 7: Commit** — `"Add calculator panels gated by chain structure"`

---

## Task 12: Article layout and styling

**Files:**
- Modify: `src/App.tsx`, `src/index.css`
- Create: `src/components/Placeholder.tsx`

**Step 1: `Placeholder.tsx`** — visually distinct dashed-border block: `<Placeholder heading="States and transitions" hint="Explain what a state is; introduce the player-lifecycle example." />`. Renders the suggested heading as a real `<h2>` and the hint as muted italic text so the owner knows what to write where.

**Step 2: `App.tsx` structure** (in reading order):

1. `<header>`: title "Player Lifecycles as Markov Chains", subtitle placeholder.
2. Placeholder: intro ("Why model players as a Markov chain?")
3. Placeholder: "States and transitions"
4. Placeholder: "The transition matrix"
5. **Tool section** (full-width): toolbar + canvas + validation + calculators.
6. Placeholder: "Absorbing states: modeling churn"
7. Placeholder: "Steady state: modeling win-back"
8. Placeholder: closing notes; `<footer>` with GitHub repo link.

**Step 3: Styling** (`src/index.css`) — article column `max-width: 720px; margin: 0 auto`, tool section breaks out to `max-width: 1080px`. System font stack, generous line-height, muted grays, one accent color. Style `.state-node` (rounded rect, white bg, border; `.invalid` → red border + badge), `.edge-label` (small pill, white bg, border). Keep it clean and unbranded — the owner will restyle.

**Step 4:** Manual browser check (desktop 1280px and narrow ~700px — canvas remains usable, no horizontal scroll of the page body).

**Step 5: Commit** — `"Add article layout with placeholder sections"`

---

## Task 13: README + GitHub Actions deploy workflow

**Files:**
- Create: `README.md`, `.github/workflows/deploy.yml`

**Step 1: `README.md`** — what the site is, live URL (fill after deploy), `npm install` / `npm run dev` / `npm run test` / `npm run build`, note that article text is placeholder scaffolding.

**Step 2: `.github/workflows/deploy.yml`:**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

**Step 3: Commit** — `"Add README and Pages deploy workflow"`

---

## Task 14: Full verification, then publish

> **For Claude:** REQUIRED SUB-SKILL: superpowers:verification-before-completion. Also run the manual browser pass with the in-app browser (preview_start + launch.json).

**Step 1: Full test suite** — `npm run test` → all green. `npm run build` → clean.

**Step 2: Manual browser verification checklist** (dev server via preview):
- [ ] Funnel preset loads by default; canvas shows 4 nodes with labeled edges and self-loop arcs.
- [ ] Absorption panel: start Tutorial → expected steps **6.0**; start Leveling → **6.7**.
- [ ] Switch to win-back preset → SteadyState panel replaces Absorption; Churned ≈ **46.9%**, Tutorial ≈ 0%.
- [ ] Forecast: funnel, start Tutorial, 8 steps → distribution sums to 100%.
- [ ] Edit an edge probability to break a row → red node badge + banner, calculators hidden; fix it → calculators return.
- [ ] Double-click pane → new state; drag handle-to-handle → new edge with remainder probability; drag to same node → self-loop; Delete key removes selection.
- [ ] Rename a state via double-click; name appears in all panels.
- [ ] Reload the page → chain persists (localStorage). Load preset → confirm dialog when there are edits.

**Step 3: STOP — confirm with the user before publishing.** Creating the public repo and pushing is outward-facing:

```bash
gh repo create markov-transitions --public --source . --push
```

Then enable Pages via Actions source:

```bash
gh api repos/{owner}/markov-transitions/pages -X POST -f build_type=workflow
```

(If this errors because Pages already exists, use `-X PUT` on the same endpoint.)

**Step 4: Verify deployment** — watch the Actions run (`gh run watch`), then load `https://<owner>.github.io/markov-transitions/` in the browser and re-run the spot checks (presets, one calculator). Fill the live URL into README, commit, push.

---

## Execution notes

- **TDD discipline:** every `src/lib/` and `src/state/` change lands test-first. UI tasks (10–12) are exempt from unit tests but not from the Task 14 manual checklist.
- **Commit after every task** (smaller commits within a task are fine).
- **YAGNI guard:** no chart library, no router, no state-management library, no URL sharing, no JSON export. If tempted, re-read the design doc's out-of-scope list.
- The math API deliberately takes plain matrices (`Matrix`, index-based) at the bottom layer and `Chain` (id-based) only in `chain.ts`/`diagnostics` — keep that separation.
