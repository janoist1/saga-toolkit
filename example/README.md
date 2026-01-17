# Saga Toolkit Example - Todo App

This project demonstrates the power of `saga-toolkit` by implementing a fully typed Todo App using **Redux Toolkit**, **Redux Saga**, and **TypeScript** (Vite + React 18).

It highlights how `saga-toolkit` bridges the gap between simple async flows (like `createAsyncThunk`) and complex Saga capabilities (like cancellation, debouncing, and worker/watcher patterns).

## 🚀 Features Demonstrated

This example covers 4 main patterns found in real-world applications:

### 1. **"Awaitable" Sagas (`createSagaAction` + `takeEveryAsync`)**
*   **Use Case**: Submitting a form (Add Todo) where the UI needs to wait for the result to clear the input or show an error.
*   **Legacy Way**: Dispatch action -> Saga listens -> Saga calls API -> Saga dispatches Success/Failure -> Component listens to store changes (Result is decoupled from dispatch).
*   **Saga Toolkit Way**: Dispatch connection -> `await dispatch(addTodo(text)).unwrap()` -> Component acts on result immediately. The Saga still handles the side effect!

### 2. **Cancellable Search (`takeLatestAsync`)**
*   **Use Case**: Type-ahead search. If the user types "A", "AB", "ABC" quickly, you only want the result for "ABC".
*   **Feature**: When a new action comes in, `takeLatestAsync` automatically cancels the previous running Saga task.
*   **Bridge Magic**: `saga-toolkit` ensures the *Promise* of the cancelled action is rejected with an `Aborted` error, so your component knows to ignore it.

### 3. **Blocking Composition (`putAsync`)**
*   **Use Case**: App initialization. You want to trigger a 'Search' action from your 'Init' saga and *wait* for it to finish before logging "Init Complete".
*   **Pattern**: `const result = yield putAsync(searchTodos('initial'))`.
*   **Benefit**: Composes decoupled actions/sagas without tight coupling or callback hell.

### 4. **Strict TypeScript Support**
*   Full typing for Actions, State, and Sagas.
*   No more `any` types in Sagas.

## 🛠 Project Structure

*   `src/slices/todoSlice.ts`: Defines the Redux slice and `createSagaAction`s. Notice how clean the reducers are (standard RTK).
*   `src/sagas.ts`: The bridge! Sagas listen to toolkit actions. They return values that automatically resolve the dispatch promise.
*   `src/App.tsx`: The UI. Shows how to `await dispatch(...)` and handle loading states.

## 📦 Installation & Run

1.  Current directory:
    ```bash
    cd example
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start Dev Server:
    ```bash
    npm run dev
    ```

4.  Open [http://localhost:5173](http://localhost:5173).

## 📝 Key Code Snippets

**Defining an Action:**
```typescript
// src/slices/todoSlice.ts
// <ReturnType, ArgumentType>
export const addTodo = createSagaAction<Todo, string>('todo/addTodo')
```

**Writing the Saga:**
```typescript
// src/sagas.ts
function* addTodoSaga(action: PayloadAction<string>) {
  // Call API
  const newTodo = yield call(api.addTodo, action.payload)
  // RETURN value becomes the fulfilled payload!
  return newTodo 
}

// Watcher
yield takeEveryAsync(actions.addTodo.pending.type, addTodoSaga)
```

**consuming in Component:**
```typescript
// src/App.tsx
const handleAdd = async () => {
  try {
    // We can await the saga!
    const todo = await dispatch(addTodo(text)).unwrap()
    console.log('Created:', todo.id)
  } catch (err) {
    console.error('Failed:', err)
  }
}
```
