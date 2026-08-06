---
order: 6
id: steady-state
label: "Steady state: win-back"
heading: "Steady state: modeling win-back"
---

Not every chain ends in a dead end. [Switch to the **Win-back loop** preset](#tool:canvas?preset=preset-winback) and you’ll notice Churned isn’t absorbing anymore — 20% of churned players wander back in as **Returning**, and from there most of them (70%) make their way to Leveling. Suddenly there’s no permanent exit at all: every player just cycles through states forever.

When a chain has no absorbing states, “expected time to churn” stops making sense — there’s no churn to expect, since in the long run everyone just keeps moving. What you want instead is the [**Steady state**](#tool:steady-state): if you let this whole system run for a very long time, what fraction of your player base ends up in each state, on any given day, forever?

Run the numbers on this preset and the picture is a little humbling: in the long run, **46.9%** of your players are sitting in Churned at any given moment — nearly half your base, quietly dormant, in every single snapshot in time. Only **27.3%** are enjoying Endgame, **16.4%** are Leveling, and a modest **9.4%** are freshly Returning. Tutorial rounds down to essentially 0%, because almost nobody stays a brand-new player for long — they either progress or churn within a week or two.

That 46.9% is the real value of modeling a win-back loop: it’s not a doom number, it’s a target. And it’s the sharpest version yet of the whole point of this essay — because now you can actually test a hunch before you spend a sprint on it.

Say your team has two ideas and budget for one. Option A: speed up onboarding, so new players graduate out of Tutorial faster. In the matrix, that’s raising Tutorial → Leveling and lowering Tutorial → Tutorial by the same amount, leaving Tutorial → Churned untouched. It sounds like exactly the kind of fix worth a sprint. Try it in the tool — set Tutorial’s row to 40% / 40% / 20% — and watch the steady state. It doesn’t move. Not “moves a little” — unchanged, to three decimal places. Tutorial is already almost nobody in the long run, so making it faster to leave changes nothing about where anybody ends up.

Option B: put that same sprint into win-back instead — raise Churned → Returning from 20% to 30%. Same amount of engineering effort, a completely different lever. Churned drops from 46.9% to **37.0%** — Leveling and Endgame both grow to take up the difference. That’s the entire value of the model in one comparison: two ideas that sounded equally promising in a room, one of them provably does nothing, the other moves the number by ten points. You didn’t need to ship either one to find out. You didn’t scoop water from anywhere — you found the part of the riverbed that was actually shaping the flow, and moved that instead.
