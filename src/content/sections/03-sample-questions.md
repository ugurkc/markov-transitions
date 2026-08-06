---
order: 3
id: sample-questions
label: Questions you can answer
heading: Questions this way of thinking actually answers
---

Each question below comes with clickable examples. Every pill loads a worked before/after into the live tool on the right, so you can watch the numbers move instead of taking my word for them.

**Is my onboarding actually the problem, or does it just feel that way?** Everyone has an intuition about which state is leaking players, and the obvious fix is usually "make the tutorial faster." Here are two rival edits to the exact same Tutorial row. Speeding up graduation barely moves a player's expected lifetime. Cutting the early-churn edge instead buys more than a full extra week per player, from the same amount of tuning.

[Onboarding baseline](#scenario:q1-baseline) [Speed up graduation](#scenario:q1-faster) [Cut early churn](#scenario:q1-gentler)

```compare
unit: weeks
Baseline: 6.0
Speed up graduation: 6.1
Cut early churn: 7.3 *
```

Click through all three and watch the expected-tenure line under the [Customer lifetime histogram](#tool:retention). If moving a number barely moves that line, your intuition was pointing at the wrong lever.

**When do players actually leave, and does it depend on where they started?** Same chain, two different starting cohorts. A hundred brand-new players average about 6 weeks before reaching Churned. A cohort that already graduated to Leveling and Endgame stretches to roughly 6.7: they had already proven a bit stickier than a brand-new arrival. Load either cohort and hit Play to watch the histogram build, player by player instead of one averaged number.

[Everyone starts brand-new](#scenario:q2-fresh) [A cohort of veterans](#scenario:q2-veterans)

```compare
unit: weeks
Brand-new cohort: 6.0
Veteran cohort: 6.7 *
```

**I’ve got budget for one fix: which lever actually moves the number?** Switch to the win-back loop, where churned players can wander back in instead of staying gone forever. Because nobody ever fully leaves, "expected weeks to churn" stops being the right question. What you want is the forecast dragged all the way to forever: what fraction of players are sitting in each state on any given day, permanently. For the baseline that is **46.9%** parked in Churned. Now compare two ideas that both sound like a sprint well spent. Faster onboarding leaves that number completely unchanged, to three decimal places. Stronger win-back drops it by ten points. Each chip below jumps the [forecast](#tool:forecast) straight to forever so you land on the number that matters.

[Win-back baseline](#scenario:q3-baseline) [Option A: faster onboarding](#scenario:q3-optionA) [Option B: stronger win-back](#scenario:q3-optionB)

```compare
unit: %
Baseline, stuck in Churned: 46.9
Option A, faster onboarding: 46.9
Option B, stronger win-back: 37.0 *
```

Same effort, one idea that provably does nothing and one that moves the number by ten points. You didn’t have to ship either one to find out.

**Does my monetization funnel behave like retention, or something else?** Try the free-to-paid funnel: same shape as the churn funnel, pointed at revenue instead. It turns out spend and tenure move together. Load each rung of the ladder and the expected-tenure line re-measures from that starting point.

[Start as Free](#scenario:q4-free) [Start as Payer](#scenario:q4-payer) [Start as Whale](#scenario:q4-whale)

```compare
unit: weeks
Free player: 7.3
Payer: 8.0
Whale: 12.0 *
```

The more invested someone already is, the longer they tend to stay invested. Same math, just with different stakes riding on it.
