import React, { useState, useEffect } from 'react'
import { useSagaActions } from 'saga-toolkit'
import { useAppSelector } from './hooks'
import { addTodo, searchTodos, initApp, refreshTodos } from './slices/todoSlice'
import './App.css'

function App() {
    const { todos, loading, error } = useAppSelector(state => state.todo)

    const [text, setText] = useState('')
    const [simulateError, setSimulateError] = useState(false)
    const [localSearch, setLocalSearch] = useState('')

    // --- Using useSagaActions Helper ---
    // Automatically binds dispatch and unwraps promises!
    const actions = useSagaActions({
        addTodo,
        searchTodos,
        initApp,
        refreshTodos
    })

    // Demonstration 1: putAsync usage (App Start)
    useEffect(() => {
        // This action waits for searchTodos inside the saga!
        const init = async () => {
            try {
                // No more dispatch or unwrap!
                await actions.initApp()
                console.log('App init finished (Saga waited for child saga)')
            } catch (e) {
                console.error('Init failed', e)
            }
        }
        init()
    }, [actions])

    // Demonstration 2: Awaitable Dispatch (Add Todo)
    const handleAddTodo = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!text.trim()) return

        try {
            // 1. Dispatch action (via helper hook)
            // No unwrap needed!
            const data = await actions.addTodo({ text, simulateError })

            console.log('Todo added successfully!', data)
            setText('')
        } catch (err) {
            console.error('Failed to add todo:', err)
        }
    }

    // Demonstration 3: Cancellable Search (takeLatestAsync)
    const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        setLocalSearch(val)

        // @ts-ignore
        actions.searchTodos(val).then((result: any) => {
            // NOTE: For now, useSagaActions unwraps everything, so we get the payload directly!
            // But be careful: if we want the full action object for specific matching, 
            // the helper assumes we just want the result.
            // However, with standard async thunks, .then(result) usually returns result.
            // Our helper returns the unwrapped promise result.

            console.log('Search finished:', result.length)
        }).catch((err: any) => {
            if (err.message === 'Aborted') {
                console.log('Previous search aborted (Expected behavior)')
            } else {
                console.error('Search error', err)
            }
        })
    }

    // Demonstration 4: Aggregated Refresh (takeAggregateAsync)
    const handleRefresh = async () => {
        console.log('Spamming refresh...')
        // Even if we call this 3 times rapidly, the saga only runs ONCE!
        // All 3 promises will resolve with the same data.
        const p1 = actions.refreshTodos()
        const p2 = actions.refreshTodos()
        const p3 = actions.refreshTodos()

        const results = await Promise.all([p1, p2, p3])
        // @ts-ignore
        console.log('Aggregated results received:', results[0])
    }

    return (
        <div className="App">
            <header className="App-header">
                <h1>Saga Toolkit Todo</h1>

                <div className="card">
                    <h3>1. Add Todo (Awaitable)</h3>
                    <p>Dispatches <code>addTodo</code>. The component waits for the API delay (500ms).</p>
                    <form onSubmit={handleAddTodo}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
                            <input
                                value={text}
                                onChange={e => setText(e.target.value)}
                                placeholder="New Todo..."
                                disabled={loading}
                            />
                            <button type="submit" disabled={loading}>
                                {loading ? 'Adding...' : 'Add'}
                            </button>
                        </div>
                        <label style={{ fontSize: '0.8rem', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={simulateError}
                                onChange={e => setSimulateError(e.target.checked)}
                                style={{ width: 'auto', marginRight: 5 }}
                            />
                            Simulate API Error
                        </label>
                    </form>
                    {error && <div className="error">{error}</div>}
                </div>

                <div className="card">
                    <h3>2. Search (Cancellable)</h3>
                    <p>Uses <code>takeLatestAsync</code>. Fast typing cancels ongoing requests.</p>
                    <input
                        value={localSearch}
                        onChange={handleSearch}
                        placeholder="Search todos..."
                    />
                </div>

                <div className="card">
                    <h3>3. Refresh (Aggregated)</h3>
                    <p>Uses <code>takeAggregateAsync</code>. Clicking multiple times rapidly only triggers ONE actual saga call.</p>
                    <button onClick={handleRefresh} disabled={loading}>
                        Refresh (Spam me!)
                    </button>
                    {loading && <p className="status">Refreshing...</p>}
                </div>

                <div className="todo-list card">
                    <h3>4. Result List</h3>
                    {todos.length === 0 ? <p>No todos found.</p> : (
                        <ul>
                            {todos.map(todo => (
                                <li key={todo.id} className={todo.completed ? 'done' : ''}>
                                    {todo.text}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </header>
        </div>
    )
}

export default App
