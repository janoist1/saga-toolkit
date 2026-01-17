import { call, cancelled } from 'redux-saga/effects'
import {
    takeEveryAsync,
    takeLatestAsync,
    putAsync
} from 'saga-toolkit'
import * as actions from './slices/todoSlice'
import { Todo } from './types'

// --- Mock API with state ---
const mockDB: Todo[] = [
    { id: '1', text: 'Buy Milk', completed: false },
    { id: '2', text: 'Walk the Dog', completed: true },
]

const api = {
    addTodo: async (text: string, simulateError: boolean): Promise<Todo> => {
        await new Promise(resolve => setTimeout(resolve, 500)) // network delay
        if (simulateError || Math.random() > 0.95) throw new Error('Simulated API Error!')

        const newTodo: Todo = {
            id: Math.random().toString(36).substr(2, 9),
            text,
            completed: false
        }
        mockDB.push(newTodo) // Save to "DB"
        return newTodo
    },
    searchTodos: async (term: string): Promise<Todo[]> => {
        await new Promise(resolve => setTimeout(resolve, 1000)) // long search

        // Filter the "DB"
        if (!term) return [...mockDB] // Return a COPY, otherwise Immer freezes mockDB when it enters state!
        return mockDB.filter(t => t.text.toLowerCase().includes(term.toLowerCase()))
    }
}

// --- Sagas ---

/**
 * 1. takeEveryAsync
 *    
 *    Handles every action dispatched.
 *    The return value is automatically dispatched as `addTodo.fulfilled`
 *    Any error thrown is dispatched as `addTodo.rejected`
 */
function* addTodoSaga(action: ReturnType<typeof actions.addTodo.pending>) {
    const { text, simulateError } = action.meta.arg
    // Call API
    const newTodo: Todo = yield call(api.addTodo, text, simulateError)
    return newTodo
}

/**
 * 2. takeLatestAsync & Cancellation
 * 
 *    If a new search is dispatched while previous is running, 
 *    the previous one is cancelled (standard Saga behavior).
 *    
 *    CRITICAL: saga-toolkit ensures the *Promise* of the 1st action 
 *    is rejected with 'Aborted', so the component knows it was cancelled.
 */
function* searchTodosSaga(action: ReturnType<typeof actions.searchTodos.pending>) {
    try {
        const term = action.meta.arg
        const results: Todo[] = yield call(api.searchTodos, term)
        return results
    } finally {
        if (yield cancelled()) {
            console.log(`Search for "${action.meta.arg}" was cancelled!`)
        }
    }
}

/**
 * 3. putAsync
 * 
 *    Allows usage of "Saga Composition".
 *    The `initApp` saga dispatches `searchTodos` and WAITS for it to finish.
 *    This is normally hard in Redux Saga without callbacks or Promisified dispatch.
 */
function* initAppSaga() {
    console.log('App initializing...')
    try {
        // Dispatch another saga action and await its result directly in the saga!
        const initialTodos = (yield putAsync(actions.searchTodos(''))) as { payload: Todo[] }

        console.log('App initialized with:', initialTodos.payload)
    } catch (err: any) {
        if (err.message === 'Aborted') {
            console.log('Init app cancelled (React Strict Mode double-invoke)')
        } else {
            console.error('Failed to init app', err)
        }
    }
}

/**
 * 4. Root Saga
 * 
 *    Wire everything up using normal Saga patterns + toolkit helpers.
 */
export default function* rootSaga() {
    yield takeEveryAsync(actions.addTodo.pending.type, addTodoSaga)
    // For search, we want to cancel previous requests -> takeLatestAsync
    yield takeLatestAsync(actions.searchTodos.pending.type, searchTodosSaga)

    yield takeEveryAsync(actions.initApp.pending.type, initAppSaga)
}
