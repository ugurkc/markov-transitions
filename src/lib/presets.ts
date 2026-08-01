import type { Chain } from './types'

// Weekly-cadence player lifecycle. Probabilities are per-week transition rates.
export const funnelPreset: Chain = {
  id: 'preset-funnel',
  name: 'Player funnel with churn',
  states: [
    { id: 'tutorial', name: 'Tutorial', position: { x: 0, y: 150 } },
    { id: 'leveling', name: 'Leveling', position: { x: 260, y: 60 } },
    { id: 'endgame', name: 'Endgame', position: { x: 520, y: 60 } },
    { id: 'churned', name: 'Churned', position: { x: 320, y: 280 } },
  ],
  transitions: [
    { id: 't-t', from: 'tutorial', to: 'tutorial', probability: 0.5 },
    { id: 't-l', from: 'tutorial', to: 'leveling', probability: 0.3 },
    { id: 't-c', from: 'tutorial', to: 'churned', probability: 0.2 },
    { id: 'l-l', from: 'leveling', to: 'leveling', probability: 0.6 },
    { id: 'l-e', from: 'leveling', to: 'endgame', probability: 0.25 },
    { id: 'l-c', from: 'leveling', to: 'churned', probability: 0.15 },
    { id: 'e-e', from: 'endgame', to: 'endgame', probability: 0.85 },
    { id: 'e-c', from: 'endgame', to: 'churned', probability: 0.15 },
    { id: 'c-c', from: 'churned', to: 'churned', probability: 1 },
  ],
  inputStateId: 'tutorial',
  outputStateId: 'churned',
}

export const winBackPreset: Chain = {
  id: 'preset-winback',
  name: 'Win-back loop',
  states: [
    { id: 'tutorial', name: 'Tutorial', position: { x: 0, y: 150 } },
    { id: 'leveling', name: 'Leveling', position: { x: 260, y: 60 } },
    { id: 'endgame', name: 'Endgame', position: { x: 520, y: 60 } },
    { id: 'churned', name: 'Churned', position: { x: 320, y: 280 } },
    { id: 'returning', name: 'Returning', position: { x: 80, y: 320 } },
  ],
  transitions: [
    { id: 't-t', from: 'tutorial', to: 'tutorial', probability: 0.5 },
    { id: 't-l', from: 'tutorial', to: 'leveling', probability: 0.3 },
    { id: 't-c', from: 'tutorial', to: 'churned', probability: 0.2 },
    { id: 'l-l', from: 'leveling', to: 'leveling', probability: 0.6 },
    { id: 'l-e', from: 'leveling', to: 'endgame', probability: 0.25 },
    { id: 'l-c', from: 'leveling', to: 'churned', probability: 0.15 },
    { id: 'e-e', from: 'endgame', to: 'endgame', probability: 0.85 },
    { id: 'e-c', from: 'endgame', to: 'churned', probability: 0.15 },
    { id: 'c-c', from: 'churned', to: 'churned', probability: 0.8 },
    { id: 'c-r', from: 'churned', to: 'returning', probability: 0.2 },
    { id: 'r-l', from: 'returning', to: 'leveling', probability: 0.7 },
    { id: 'r-c', from: 'returning', to: 'churned', probability: 0.3 },
  ],
  inputStateId: 'tutorial',
  outputStateId: 'churned',
}

export const presets = [funnelPreset, winBackPreset]
