# Watershed

An interactive article and tool for modeling player lifecycles — onboarding,
engagement, churn, and win-back — as Markov chains. You can't move the
destination directly; you can only reshape the path that leads there. Build a
chain of states and transitions on an editable canvas, then run calculators
for:

- **Cohort simulation** — designate one state as the input (where new players
  join) and one as the output (where players leave), painted green/red on the
  canvas; drop whole players into states, optionally add an ongoing input
  rate, and run the chain for N weeks, animating each player's moves along
  the graph. Every player samples the transition row individually (seeded
  PRNG, so runs are reproducible), so results vary around the expected
  forecast. The simulation won't run until both an input and output state are
  chosen
- **Retention chart** — active-player curve (everyone not in the output
  state) plotted against weeks elapsed, plus a customer-lifetime histogram
  (how many weeks the starting cohort stuck around before reaching the
  output state, computed from an acquisition-free shadow run so it isn't
  skewed by later arrivals) — both update live alongside the simulation
- **N-step forecast** — project the state distribution forward N weeks,
  starting everyone in whichever state is set as the input above
- **Steady state** — the long-run equilibrium distribution; for a chain with
  an absorbing state this trends toward 100% there, showing that everyone
  gets there eventually

**Live site:** https://ugurkc.github.io/riverbed/

## Local development

```bash
npm install
npm run dev      # start the dev server
npm run test     # run the test suite
npm run build    # type-check and build for production
npm run lint     # run oxlint
```

## Editing the essay text

The essay prose is editable in the browser at
**<https://ugurkc.github.io/riverbed/admin/>** (Sveltia CMS, vendored in
`public/admin/`). Sign-in uses the same GitHub fine-grained access token as
the hub site — setup steps in the
[hub README](https://github.com/ugurkc/ugurkc.github.io#editing-content-no-code).

The content model:

- `src/content/sections/*.md` — one file per essay section. Frontmatter:
  `order` (drives the sequence), optional `id` (the anchor for deep links),
  optional `label` (a section with a label gets a sidebar entry; requires an
  `id`), optional `heading`. The body is the section's markdown prose.
- `src/content/meta.md` — the essay header: `eyebrow` and `title` in the
  frontmatter; the body is the subtitle, which must stay a single paragraph.

Every save commits to `main`, which runs the full CI suite (161 tests,
including content-shape checks and an admin-config drift guard) before
deploying — a bad edit never deploys; the live site stays on the last good
version.

Prefer files? Edit the markdown under `src/content/` directly and push —
same pipeline.

### Linking prose to the tool

Wherever the essay says "look at the matrix on the right," make it a link.
A markdown link whose href uses the `#tool:` scheme renders as an inline
button that scrolls the matching tool panel into view and pulses a
highlight on it:

```markdown
Look at the [“Transition matrix” table](#tool:matrix) …
[Switch to the **Win-back loop** preset](#tool:canvas?preset=preset-winback) …
```

Anchors are declared as `data-tool-anchor="…"` attributes on panel roots
(currently: `canvas`, `simulate`, `retention`, `matrix`, `forecast`,
`steady-state`). The optional `?preset=<id>` param actually loads that
preset before focusing. CI validates every `#tool:` link against the
declared anchors and real preset ids, so a typo fails the build instead of
shipping a dead link. Implementation: `src/lib/toolBridge.ts` (the DOM
contract), `src/components/ToolLink.tsx` (the inline button), `EssayLink`
in `src/App.tsx` (the markdown mapping).

## Status

The interactive canvas, calculators, and article prose are all in place.
