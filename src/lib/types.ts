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
}
