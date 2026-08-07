---
order: 5
id: real-world-modeling
label: Before you build this
heading: Before you take this out of the lab
---

Everything up to this point has been running in a lab setting: clean presets, made-up numbers, four or five states that happen to line up with a tidy story. That’s on purpose. The whole point of a toy model is to build the intuition without a real dataset getting in the way first. But intuition alone doesn’t ship. Turning this from a thinking tool into something you’d actually trust for a real decision takes a few more steps.

**Start with the question, not the diagram.** It’s tempting to open with “what are our states” and work outward, but that tends to produce a chain that’s technically tidy and answers nothing anyone asked. Pick the business problem first: is onboarding actually the leak, is one win-back idea worth more than another, does spend track retention. Let *that* question decide which states earn a place on the canvas. A chain built to answer “should we invest in win-back” needs a Churned-to-Returning edge; a chain built to answer “is our tutorial too long” probably doesn’t.

**Pull the probabilities from telemetry, not from a hunch.** Every number in this tool is illustrative: the transition matrix here isn’t the transition matrix of any real game. In production, those percentages come from actual session logs: how often a player in state A actually turns up in state B a week later. And they don’t stay put once you’ve measured them. A balance patch, a new event, or just the game maturing can quietly move a transition rate, so the matrix needs a periodic recheck against fresh data, not a one-time calibration you set and forget.

**Watch for cohorts you’ve accidentally jammed together.** A single matrix implicitly assumes everyone in a state behaves the same way, and that assumption breaks the moment you mix two genuinely different populations into one chain: whales and minnows, day-one players and day-one-thousand veterans, mobile and console. Average their transition rates together and you can end up with a matrix that describes neither group well, or worse, a matrix where a trend that’s real inside each cohort reverses once they’re blended (that’s [**Simpson’s paradox**](https://en.wikipedia.org/wiki/Simpson%27s_paradox); the same mixing problem shows up as unexplained variance under the [**law of total variance**](https://en.wikipedia.org/wiki/Law_of_total_variance)). When the populations genuinely differ, the fix isn’t a smarter single chain. It’s running one chain per cohort, in parallel, and comparing the pictures side by side.

None of this makes the model in this tool wrong for what it’s for. It’s a lens, not a dashboard: meant to sharpen the question you bring to the real data, not replace the data itself.
