import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { createSagaAction } from 'saga-toolkit'
import { AppState, Todo } from '../types'

const name = 'todo'

const initialState: AppState = {
    todos: [],
    loading: false,
    error: null,
    searchTerm: '',
}

/**
 * 1. createSagaAction
 * 
 * Creates an async thunk that triggers a saga.
 * Unlike createAsyncThunk, the "payload creator" is not a function you write,
 * but handled by saga-toolkit to bridge to a Saga.
 */

// Action to fetch all todos (demonstrates putAsync)
export const initApp = createSagaAction<void, void>(`${name}/initApp`)

// Action to add a todo (demonstrates takeEveryAsync with return value)
export const addTodo = createSagaAction<Todo, { text: string; simulateError: boolean }>(`${name}/addTodo`)

// Action to search todos (demonstrates takeLatestAsync and cancellation)
export const searchTodos = createSagaAction<Todo[], string>(`${name}/searchTodos`)

// Action to clear completed (demonstrates standard action)
export const clearCompleted = createSagaAction<void, void>(`${name}/clearCompleted`)


const todoSlice = createSlice({
    name,
    initialState,
    reducers: {
        // Normal reducers work as expected
        setSearchTerm: (state, action: PayloadAction<string>) => {
            state.searchTerm = action.payload
        }
    },
    extraReducers: (builder) => {
        // 2. Handle simple loading states automatically

        // --- addTodo ---
        builder.addCase(addTodo.pending, (state) => {
            state.loading = true
            state.error = null
        })
        builder.addCase(addTodo.fulfilled, (state, { payload }) => {
            state.loading = false
            state.todos.push(payload)
        })
        builder.addCase(addTodo.rejected, (state, { error }) => {
            state.loading = false
            state.error = error.message || 'Failed to add todo'
        })

        // --- searchTodos ---
        builder.addCase(searchTodos.pending, (state) => {
            state.loading = true
        })
        builder.addCase(searchTodos.fulfilled, (state, { payload }) => {
            state.loading = false
            state.todos = payload
        })
        // Note: We might ignore rejection for search if it was cancelled
        builder.addCase(searchTodos.rejected, (state, { error }) => {
            if (error.message !== 'Aborted') {
                state.loading = false
                state.error = error.message || 'Search failed'
            } else {
                // Just stop loading if aborted
                state.loading = false
            }
        })

        // --- initApp ---
        builder.addCase(initApp.fulfilled, () => {
            // logic if needed
        })
    },
})

export const { setSearchTerm } = todoSlice.actions
export default todoSlice.reducer
