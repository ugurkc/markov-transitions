---
order: 5
id: absorbing-states
label: "Absorbing states: churn"
heading: "Absorbing states: modeling churn"
---

Some states are one-way doors. In the [**Player funnel with churn** preset](#tool:canvas?preset=preset-funnel) (the first tab in the tool on the right), Churned is what’s called an **absorbing state** — once a player lands there, they stay there forever. Its row in the matrix is 100% self-loop; there’s no way back out.

Run the simulation on this preset and look at the [**Customer lifetime** histogram](#tool:retention) in the Retention section on the right. It buckets the starting cohort by exactly how many weeks it took each of them to land in Churned — the same question every retention team actually cares about, answered player by player instead of as one averaged number.

For this preset, the honest answer is: everyone eventually churns, 100%, no exceptions — Churned is the only door that never opens back up. What differs is the *when*. A cohort starting in Tutorial averages about **6 weeks** before they’re gone, spread out across the histogram rather than landing on one week. Zero out Tutorial’s starting population and put everyone in Leveling or Endgame instead, and that same histogram shifts right — those players buy a little more time, roughly **6.7 weeks** on average, because they’ve already proven they’re a bit stickier than a brand-new arrival.

Try it yourself: make that starting-population change, rerun the simulation, and watch the histogram move. Then nudge Endgame’s self-loop probability up in the matrix table and rerun again — that’s the whole game of retention work, distilled into one number in one table.
