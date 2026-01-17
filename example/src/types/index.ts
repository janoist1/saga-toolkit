export interface Todo {
    id: string
    text: string
    completed: boolean
}

export interface AppState {
    todos: Todo[]
    loading: boolean
    error: string | null
    searchTerm: string
}
