---
order: 2
id: states-and-transitions
label: States and transitions
heading: States and transitions
---

So here’s the lens, in two words: **state** and **transition**. Everything after this is just those two ideas, applied.

A **state** is just a label for “where a player currently stands” in their relationship with your game. The example loaded in [the tool on the right](#tool:canvas) uses four: **Tutorial** (brand new, still learning the ropes), **Leveling** (comfortable, making steady progress), **Endgame** (mastered the core loop, chasing whatever’s left), and **Churned** (gone quiet — no more sessions).

A **transition** is the probability that a player hops from one state to another between now and the next check-in — a week, in this example, though you can use whatever cadence fits your game. Some transitions are hopeful: Tutorial → Leveling means someone stuck around long enough to “get it.” Others are the ones that keep product managers up at night: Leveling → Churned.

Here’s the one rule that makes the whole system work: every state’s outgoing probabilities have to add up to 100%. A player in Tutorial this week is *somewhere* next week — maybe still in Tutorial, maybe graduated to Leveling, maybe churned. There’s no fourth option where they quietly vanish from the math. That one constraint is what turns a pile of guesses into an actual predictive model.
