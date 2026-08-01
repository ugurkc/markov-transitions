# Markov Transitions

An interactive article and tool for modeling player lifecycles — onboarding,
engagement, churn, and win-back — as Markov chains. Build a chain of states
and transitions on an editable canvas, then run calculators for:

- **Cohort simulation** — drop whole players into states and run the chain
  for N periods, animating each player's moves along the graph. Every player
  samples the transition row individually (seeded PRNG, so runs are
  reproducible), so results vary around the expected forecast
- **Diagnostics** — per-state stickiness (self-loop probability), top
  outbound transition, and drop-off rate into a chosen risk state
- **N-step forecast** — project the state distribution forward from a
  starting mix
- **Absorption** — absorption probabilities and expected time to churn for
  chains with absorbing states
- **Steady state** — the long-run equilibrium distribution for chains without
  absorbing states

**Live site:** https://ugurkc.github.io/markov-transitions/

## Local development

```bash
npm install
npm run dev      # start the dev server
npm run test     # run the test suite
npm run build    # type-check and build for production
npm run lint     # run oxlint
```

## Status

The interactive canvas, calculators, and article prose are all in place.
