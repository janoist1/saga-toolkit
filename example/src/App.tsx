import React, { useState, useEffect } from 'react'
import { unwrapResult } from '@reduxjs/toolkit'
import { useAppDispatch, useAppSelector } from './hooks'
import { addTodo, searchTodos, initApp } from './slices/todoSlice'
import './App.css'

function App() {
    const dispatch = useAppDispatch()
    const { todos, loading, error } = useAppSelector(state => state.todo)

    const [text, setText] = useState('')
    const [localSearch, setLocalSearch] = useState('')

    // Demonstration 1: putAsync usage (App Start)
    useEffect(() => {
        // This action waits for searchTodos inside the saga!
        const init = async () => {
            try {
                await dispatch(initApp()).unwrap()
                console.log('App init finished (Saga waited for child saga)')
            } catch (e) {
                console.error('Init failed', e)
            }
        }
        init()
    }, [dispatch])

    // Demonstration 2: Awaitable Dispatch (Add Todo)
    const handleAddTodo = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!text.trim()) return

        try {
            // 1. Dispatch action
            const actionResult = await dispatch(addTodo(text))
            // 2. Wait for Saga to finish and unwrap payload
            const data = unwrapResult(actionResult)

            console.log('Todo added successfully!', data)
            setText('')
        } catch (err) {
            console.error('Failed to add todo:', err)
            alert(`Error: ${err}`)
        }
    }

    // Demonstration 3: Cancellable Search (takeLatestAsync)
    const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        setLocalSearch(val)

        // We don't await this usually for search-as-you-type, but you COULD.
        // saga-toolkit will reject the previous promise with "Aborted" if typing fast.
        dispatch(searchTodos(val)).then(result => {
            if (searchTodos.fulfilled.match(result)) {
                console.log('Search finished:', result.payload.length)
            }
        }).catch(err => {
            if (err.message === 'Aborted') {
                console.log('Previous search aborted (Expected behavior)')
            } else {
                console.error('Search error', err)
            }
        })
    }

    return (
        <div className="App">
            <header className="App-header">
                <h1>Saga Toolkit Todo</h1>

                <div className="card">
                    <h3>1. Add Todo (Awaitable)</h3>
                    <p>Dispatches <code>addTodo</code>. The component waits for the API delay (500ms).</p>
                    <form onSubmit={handleAddTodo}>
                        <input
                            value={text}
                            onChange={e => setText(e.target.value)}
                            placeholder="New Todo..."
                            disabled={loading}
                        />
                        <button type="submit" disabled={loading}>
                            {loading ? 'Adding...' : 'Add'}
                        </button>
                    </form>
                    {error && <div className="error">{error}</div>}
                </div>

                <div className="card">
                    <h3>2. Search (Cancellable)</h3>
                    <p>Dispatches <code>searchTodos</code>. Typing fast cancels previous requests (takeLatest).</p>
                    <input
                        value={localSearch}
                        onChange={handleSearch}
                        placeholder="Search..."
                    />
                </div>

                <div className="list">
                    {todos.map(todo => (
                        <div key={todo.id} className={`todo-item ${todo.completed ? 'done' : ''}`}>
                            {todo.text}
                        </div>
                    ))}
                    {todos.length === 0 && !loading && <p>No todos found</p>}
                </div>
            </header>
        </div>
    )
}

export default App
