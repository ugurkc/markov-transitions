# Markov Transitions

An interactive article and tool for modeling player lifecycles — onboarding,
engagement, churn, and win-back — as Markov chains. Build a chain of states
and transitions on an editable canvas, then run calculators for:

- **Diagnostics** — per-state stickiness (self-loop probability), top
  outbound transition, and drop-off rate into a chosen risk state
- **N-step forecast** — project the state distribution forward from a
  starting mix
- **Absorption** — absorption probabilities and expected time to churn for
  chains with absorbing states
- **Steady state** — the long-run equilibrium distribution for chains without
  absorbing states

**Live site:** _(filled in after first deploy — see Task 14)_

## Local development

```bash
npm install
npm run dev      # start the dev server
npm run test     # run the test suite
npm run build    # type-check and build for production
npm run lint     # run oxlint
```

## Status

The interactive canvas and calculators are fully implemented. The article's
prose sections are currently placeholder scaffolding pending real content.
