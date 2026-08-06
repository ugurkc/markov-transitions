---
order: 4
id: transition-matrix
label: The transition matrix
heading: The transition matrix
---

All of those transitions live together in one tidy grid: the **transition matrix**. Look at the [“Transition matrix” table](#tool:matrix) in the tool on the right and you’ll see exactly this — one row per starting state, one column per destination, and every cell a probability.

Read a row left to right and you’re reading a state’s entire future, laid out as percentages. Take the Tutorial row in the default example: 50% chance of staying put, 30% chance of graduating to Leveling, 20% chance of churning. Add those three up — 0.5 + 0.3 + 0.2 — and you get exactly 1. Same rule as a moment ago, just made visible.

The diagonal (Tutorial → Tutorial, Leveling → Leveling, and so on) tells you how **sticky** a state is — how likely a player is to just stay put. A high diagonal number is comforting: people are settling in. A low one, paired with a big number elsewhere in the row, means the state is **leaky** — players pass through it quickly. Endgame’s 85% self-loop, for instance, says players who reach it tend to stay — exactly what you’d hope for the state you worked hardest to build.

Best part: this table isn’t just for reading. Click any cell and type a new number — the canvas on the right updates instantly, and so does every calculator underneath it. It’s the fastest way to sanity-check “what if churn from Leveling were lower” without ever opening a spreadsheet.

And if the probabilities still feel abstract, drop a hundred players into the [**Simulate a cohort** panel](#tool:simulate) and hit play. Every dot travelling along an edge is a player who just rolled these exact numbers — the matrix, made of people.
