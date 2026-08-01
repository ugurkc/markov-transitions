export interface StateNode {
  id: string
  name: string
  position: { x: number; y: number }
}

export interface Transition {
  id: string
  from: string
  to: string
  probability: number
}

export interface Chain {
  id: string
  name: string
  states: StateNode[]
  transitions: Transition[]
  /** State new players join the simulation through; null until chosen. */
  inputStateId?: string | null
  /** State that represents having left the system; null until chosen. */
  outputStateId?: string | null
}
