---
order: 6
id: steady-state
label: "Steady state: win-back"
heading: "Steady state: modeling win-back"
---

Not every chain ends in a dead end. [Switch to the **Win-back loop** preset](#tool:canvas?preset=preset-winback) and you’ll notice Churned isn’t absorbing anymore — 20% of churned players wander back in as **Returning**, and from there most of them (70%) make their way to Leveling. Suddenly there’s no permanent exit at all: every player just cycles through states forever.

When a chain has no absorbing states, “expected time to churn” stops making sense — there’s no churn to expect, since in the long run everyone just keeps moving. Instead, the tool shows you the [**Steady state**](#tool:steady-state): if you let this whole system run for a very long time, what fraction of your player base ends up in each state, on any given day, forever?

Run the numbers on this preset and the picture is a little humbling: in the long run, **46.9%** of your players are sitting in Churned at any given moment — nearly half your base, quietly dormant, in every single snapshot in time. Only **27.3%** are enjoying Endgame, **16.4%** are Leveling, and a modest **9.4%** are freshly Returning. Tutorial rounds down to essentially 0%, because almost nobody stays a brand-new player for long — they either progress or churn within a week or two.

That 46.9% is the real value of modeling a win-back loop: it’s not a doom number, it’s a target. Every tenth of a percent you shave off Churned’s self-loop — by getting a win-back offer in front of players faster, or smoothing the on-ramp back into Leveling — permanently reshapes that whole steady-state mix in your favor.
