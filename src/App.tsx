import './App.css'
import { ChainCanvas } from './components/ChainCanvas'
import { CalculatorsSection } from './components/panels/CalculatorsSection'
import { useChain } from './state/useChain'

function App() {
  const { chain, dispatch } = useChain()
  return (
    <>
      <h1>Markov Transitions</h1>
      <ChainCanvas chain={chain} dispatch={dispatch} />
      <CalculatorsSection chain={chain} />
    </>
  )
}

export default App
