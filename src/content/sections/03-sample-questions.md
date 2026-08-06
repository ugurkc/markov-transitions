---
order: 3
id: sample-questions
label: Questions you can answer
heading: Questions this way of thinking actually answers
---

**Is my onboarding actually the problem, or does it just feel that way?** Everyone has an intuition about which state is leaking players. The way to check it without shipping anything is to change that state's row in the [transition matrix](#tool:matrix) and watch the rest of the system respond: the canvas, the simulation, everything downstream updates instantly. If moving a number there barely moves anything else, your intuition was pointing at the wrong lever.

**When do players actually leave, and does it depend on where they started?** Run the [Player funnel with churn preset](#tool:canvas?preset=preset-funnel) and look at the [Customer lifetime histogram](#tool:retention): it buckets the starting cohort by exactly how many weeks it took each of them to reach Churned, player by player instead of one averaged number. Starting everyone in Tutorial, that average is about **6 weeks**. Start them in Leveling or Endgame instead and it stretches to roughly **6.7**. They’d already proven a bit stickier than a brand-new arrival.

**I’ve got budget for one fix: which lever actually moves the number?** Switch to the [win-back loop preset](#tool:canvas?preset=preset-winback), where churned players can wander back in instead of staying gone forever. Because nobody ever fully leaves, “expected weeks to churn” stops being the right question. What you want is the [steady state](#tool:steady-state): run the system forward forever and see what fraction of your players are sitting in each state on any given day. For this preset that’s **46.9%** parked in Churned, permanently. Now compare two ideas that both sound like a sprint well spent: speeding up onboarding (Tutorial graduates faster, same churn rate) leaves that 46.9% completely unchanged. Tutorial is already almost nobody in the long run, so making it faster to leave changes nothing about where anybody ends up. Investing that same sprint in win-back instead (raising the rate churned players return) drops it to **37.0%**. Same effort, one idea that provably does nothing and one that moves the number by ten points. You didn’t have to ship either one to find out.

**Does my monetization funnel behave like retention, or something else?** Try the [free-to-paid funnel](#tool:canvas?preset=preset-monetization): same shape as the churn funnel, pointed at revenue instead. It turns out spend and tenure move together: a free player’s expected time before lapsing is about **7.3 weeks**, a paying one **8.0**, and a whale **12.0**. The more invested someone already is, the longer they tend to stay invested. Same math, just with different stakes riding on it.
