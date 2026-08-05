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

// Same math, a different question: skill instead of retention. Ranks are
// states, promotion and demotion are transitions, and players leave the
// ladder by going Inactive rather than by churning outright.
export const rankedPreset: Chain = {
  id: 'preset-ranked',
  name: 'Ranked ladder',
  states: [
    { id: 'bronze', name: 'Bronze', position: { x: 0, y: 260 } },
    { id: 'silver', name: 'Silver', position: { x: 220, y: 190 } },
    { id: 'gold', name: 'Gold', position: { x: 440, y: 120 } },
    { id: 'platinum', name: 'Platinum', position: { x: 660, y: 50 } },
    { id: 'inactive', name: 'Inactive', position: { x: 330, y: 400 } },
  ],
  transitions: [
    { id: 'b-b', from: 'bronze', to: 'bronze', probability: 0.55 },
    { id: 'b-s', from: 'bronze', to: 'silver', probability: 0.25 },
    { id: 'b-i', from: 'bronze', to: 'inactive', probability: 0.2 },
    { id: 's-b', from: 'silver', to: 'bronze', probability: 0.15 },
    { id: 's-s', from: 'silver', to: 'silver', probability: 0.55 },
    { id: 's-g', from: 'silver', to: 'gold', probability: 0.2 },
    { id: 's-i', from: 'silver', to: 'inactive', probability: 0.1 },
    { id: 'g-s', from: 'gold', to: 'silver', probability: 0.15 },
    { id: 'g-g', from: 'gold', to: 'gold', probability: 0.6 },
    { id: 'g-p', from: 'gold', to: 'platinum', probability: 0.15 },
    { id: 'g-i', from: 'gold', to: 'inactive', probability: 0.1 },
    { id: 'p-g', from: 'platinum', to: 'gold', probability: 0.15 },
    { id: 'p-p', from: 'platinum', to: 'platinum', probability: 0.75 },
    { id: 'p-i', from: 'platinum', to: 'inactive', probability: 0.1 },
    { id: 'i-i', from: 'inactive', to: 'inactive', probability: 1 },
  ],
  inputStateId: 'bronze',
  outputStateId: 'inactive',
}

// The retention funnel's shape pointed at revenue instead. Free players
// convert, converted players occasionally become whales, and everyone can
// fall back a step or lapse entirely.
export const monetizationPreset: Chain = {
  id: 'preset-monetization',
  name: 'Free-to-paid funnel',
  states: [
    { id: 'free', name: 'Free', position: { x: 0, y: 150 } },
    { id: 'payer', name: 'Payer', position: { x: 260, y: 60 } },
    { id: 'whale', name: 'Whale', position: { x: 520, y: 60 } },
    { id: 'lapsed', name: 'Lapsed', position: { x: 320, y: 280 } },
  ],
  transitions: [
    { id: 'f-f', from: 'free', to: 'free', probability: 0.82 },
    { id: 'f-p', from: 'free', to: 'payer', probability: 0.04 },
    { id: 'f-l', from: 'free', to: 'lapsed', probability: 0.14 },
    { id: 'p-f', from: 'payer', to: 'free', probability: 0.17 },
    { id: 'p-p', from: 'payer', to: 'payer', probability: 0.6 },
    { id: 'p-w', from: 'payer', to: 'whale', probability: 0.08 },
    { id: 'p-l', from: 'payer', to: 'lapsed', probability: 0.15 },
    { id: 'w-p', from: 'whale', to: 'payer', probability: 0.1 },
    { id: 'w-w', from: 'whale', to: 'whale', probability: 0.85 },
    { id: 'w-l', from: 'whale', to: 'lapsed', probability: 0.05 },
    { id: 'l-l', from: 'lapsed', to: 'lapsed', probability: 1 },
  ],
  inputStateId: 'free',
  outputStateId: 'lapsed',
}

export const presets = [funnelPreset, winBackPreset, rankedPreset, monetizationPreset]
