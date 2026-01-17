import { call } from 'redux-saga/effects'
import { takeEveryAsync, takeLatestAsync, putAsync, takeAggregateAsync, SagaActionFromCreator } from 'saga-toolkit'
import * as actions from './slices/todoSlice'
import { Todo } from './types'

// --- Mock API ---
// We keep a simple local array to simulate a DB
const mockDB: Todo[] = [
    { id: '1', text: 'Learn Redux Saga', completed: true },
    { id: '2', text: 'Master Saga Toolkit', completed: false },
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
function* addTodoSaga(action: SagaActionFromCreator<typeof actions.addTodo>) {
    const { text, simulateError } = action.meta.arg
    // Call API
    const newTodo: Todo = yield call(api.addTodo, text, simulateError)
    return newTodo
}

/**
 * 2. takeLatestAsync
 *    
 *    Same as takeEveryAsync, but cancels previous running task if a new 
 *    matching action is dispatched. Perfect for type-ahead search!
 */
function* searchTodosSaga(action: SagaActionFromCreator<typeof actions.searchTodos>) {
    const term = action.meta.arg
    // API Call (will be cancelled by saga-toolkit if user types fast)
    const results: Todo[] = yield call(api.searchTodos, term)
    return results
}

/**
 * 3. takeAggregateAsync
 * 
 *    Wait for the saga to finish for the first action. If subsequent actions
 *    are dispatched WHILE IT IS RUNNING, they share the same promise!
 *    Great for "Refresh" buttons to avoid duplicate parallel requests.
 */
function* refreshTodosSaga() {
    console.log('Refresh triggered...')
    const results: Todo[] = yield call(api.searchTodos, '')
    console.log('Refresh finished.')
    return results
}

/**
 * 4. putAsync 
 *    
 *    Dispatches another saga action and awaits its completion inside the saga.
 */
function* initAppSaga() {
    try {
        console.log('Initializing App...')
        // We can await another saga action!
        yield putAsync(actions.searchTodos(''))
        console.log('App Initialized.')
    } catch (e: any) {
        if (e.message === 'Aborted') return // React StrictMode sometimes triggers this
        throw e
    }
}

export default function* todoSaga() {
    // 1. Every addTodo gets handled
    yield takeEveryAsync(actions.addTodo.pending.type, addTodoSaga)

    // 2. Only the latest search is kept
    yield takeLatestAsync(actions.searchTodos.pending.type, searchTodosSaga)

    // 3. Duplicate refreshes are aggregated
    yield takeAggregateAsync(actions.refreshTodos.pending.type, refreshTodosSaga)

    // 4. App init logic
    yield takeEveryAsync(actions.initApp.pending.type, initAppSaga)
}
