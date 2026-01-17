import { call, cancelled } from 'redux-saga/effects'
import {
    takeEveryAsync,
    takeLatestAsync,
    putAsync
} from 'saga-toolkit'
import { PayloadAction } from '@reduxjs/toolkit'
import * as actions from './slices/todoSlice'
import { Todo } from './types'

// --- Mock API ---
const api = {
    addTodo: async (text: string): Promise<Todo> => {
        await new Promise(resolve => setTimeout(resolve, 500)) // network delay
        if (Math.random() > 0.9) throw new Error('Random Network Error!')
        return {
            id: Math.random().toString(36).substr(2, 9),
            text,
            completed: false
        }
    },
    searchTodos: async (term: string): Promise<Todo[]> => {
        await new Promise(resolve => setTimeout(resolve, 1000)) // long search
        // Mock result
        return [
            { id: '1', text: `Result for ${term} 1`, completed: false },
            { id: '2', text: `Result for ${term} 2`, completed: true },
        ]
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
function* addTodoSaga(action: PayloadAction<string>) {
    const text = action.payload
    // Call API
    const newTodo: Todo = yield call(api.addTodo, text)
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
function* searchTodosSaga(action: PayloadAction<string>) {
    try {
        const term = action.payload
        const results: Todo[] = yield call(api.searchTodos, term)
        return results
    } finally {
        if (yield cancelled()) {
            console.log(`Search for "${action.payload}" was cancelled!`)
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
        const initialTodos = (yield putAsync(actions.searchTodos('Initial'))) as { payload: Todo[] }

        console.log('App initialized with:', initialTodos.payload)
    } catch (err) {
        console.error('Failed to init app', err)
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
