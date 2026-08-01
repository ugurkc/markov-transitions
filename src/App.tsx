import './App.css'
import { ChainCanvas } from './components/ChainCanvas'
import { useChain } from './state/useChain'

function App() {
  const { chain, dispatch } = useChain()
  return (
    <>
      <h1>Markov Transitions</h1>
      <ChainCanvas chain={chain} dispatch={dispatch} />
    </>
  )
}

export default App
