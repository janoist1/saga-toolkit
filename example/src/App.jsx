import { unwrapResult } from '@reduxjs/toolkit'
import { useApp, useAppStart } from './hooks'
import logo from './logo.svg';
import './App.css';

function App() {
  const { started, click, fetchThings, fetchThingsDebounce } = useApp()

  const handleClick = async () => {
    try {
      const result = await click()
      console.log('handleClick', { result })
    } catch (error) {
      console.log('handleClick', { error })
    }
  }

  const handleFetchThings = async () => {
    try {
      const result = await fetchThings(false)
      console.log('handleFetchThings', { result })
    } catch (error) {
      console.log('handleFetchThings', { error })
    }
  }

  const handleFetchThingsDebounce = async () => {
    try {
      const result = unwrapResult(await fetchThingsDebounce(false))
      console.log('fetchThingsDebounce SUCCESS', result)
    } catch (error) {
      console.log('fetchThingsDebounce ERROR', error)
    }
  }

  useAppStart()

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          {started ? <>Edit <code>src/App.js</code> and save to reload.</> : <span>app starting...</span>}
        </p>
        <button onClick={handleClick}>click</button>
        <button onClick={handleFetchThings}>fetchThings</button>
        <button onClick={handleFetchThingsDebounce}>fetchThingsDebounce</button>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;
