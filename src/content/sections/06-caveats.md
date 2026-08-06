---
order: 6
id: caveats
---

A few honest caveats before you go build your own. A Markov chain assumes the future only depends on where a player is *right now*: not how they got there, not how long they’ve been there, not what day of the week it is. Real players are messier than that: someone who’s been stuck in Tutorial for one week behaves differently than someone stuck there for eight. If that distinction matters for your game, you’ll eventually want richer models. But this one gets you shockingly far for how simple it is, and it’s the right place to start.

The states and probabilities baked into the presets here are illustrative, not measured: plug in your own numbers from real cohort data and the same math turns into a genuinely useful forecasting tool. Natural next steps from there include splitting states by acquisition channel or platform, modeling seasonal shifts by re-estimating the matrix month over month, or feeding the customer-lifetime numbers straight into a lifetime-value model.

Go back to that room from the start of this page, the one full of people who can describe point B in perfect detail and have nothing but hope for how they’ll get there. They’re not wrong to be hopeful, and they’re not wrong to ship and watch; most things worth building still have to survive contact with real players. But now, before the sprint gets planned, there’s a question worth asking out loud: which of these ideas actually moves the number, and which one just *feels* like it should? You have a way to ask the system instead of the room.

That’s the whole premise, restated one last time: you were never going to move the water by hand. You just needed to see the riverbed.

If you’d rather stop reading and start building, [the playground](play/) is this same tool with the writing out of the way and the graph given room to breathe. Whatever you make there is waiting for you back here.

If you build something with this, or find a bug, the source is right here. Link in the footer. Happy modeling.
