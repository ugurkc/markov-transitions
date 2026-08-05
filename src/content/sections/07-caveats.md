---
order: 7
---

A few honest caveats before you go build your own. A Markov chain assumes the future only depends on where a player is *right now* — not how they got there, not how long they’ve been there, not what day of the week it is. Real players are messier than that: someone who’s been stuck in Tutorial for one week behaves differently than someone stuck there for eight. If that distinction matters for your game, you’ll eventually want richer models — but this one gets you shockingly far for how simple it is, and it’s the right place to start.

The states and probabilities baked into the presets here are illustrative, not measured — plug in your own numbers from real cohort data and the same math turns into a genuinely useful forecasting tool. Natural next steps from there include splitting states by acquisition channel or platform, modeling seasonal shifts by re-estimating the matrix month over month, or feeding the customer-lifetime numbers straight into a lifetime-value model.

If you build something with this, or find a bug, the source is right here — link in the footer. Happy modeling.
