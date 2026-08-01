# Watershed

A personal blog, with Watershed — an interactive article and tool for
modeling player lifecycles — onboarding, engagement, churn, and win-back — as
Markov chains — as its first post. You can't move the destination directly;
you can only reshape the path that leads there. Build a chain of states and
transitions on an editable canvas, then run calculators for:

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

**Live site:** https://ugurkc.github.io/watershed/ (blog home, with a
directory of posts) — the Watershed essay itself lives at
https://ugurkc.github.io/watershed/essays/watershed/

The site is a Vite multi-page build: the blog landing page/directory at the
root (`index.html`, `src/Landing.tsx`), and each post as its own page under
`essays/<slug>/` (the Watershed essay is `essays/watershed/index.html`,
`src/App.tsx`).

## Local development

```bash
npm install
npm run dev      # start the dev server
npm run test     # run the test suite
npm run build    # type-check and build for production
npm run lint     # run oxlint
```

## Status

The interactive canvas, calculators, and article prose are all in place, and
the site now sits behind a blog landing page/directory with Watershed as the
first post.
