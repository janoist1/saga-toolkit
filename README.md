# Saga Toolkit

**Seamlessly integrate Redux Toolkit with Redux Saga.**

`saga-toolkit` acts as a bridge between Redux Toolkit's `createAsyncThunk` and Redux Saga. It allows you to dispatch actions that trigger Sagas, while retaining the ability to `await` the result (promise) directly in your components or thunks.

If you love the "fire-and-forget" nature of Sagas for complex flows but miss the convenience of `await dispatch(action)` for simple request/response patterns (like form submissions), this library is for you.

## Features

- 🤝 **Bridge Pattern**: Connects `createAsyncThunk` (RTK) with `takeEvery` / `takeLatest` (Saga).
- 🔄 **Promise Support**: `await` your Saga actions in React components.
- ⚡ **Reduce Boilerplate**: Easily handle loading/success/error states in slices using standard RTK patterns.
- 🛑 **Cancellation**: Propagates cancellation from the promise to the Saga.

## 🎮 Try the Example App

This project includes a fully functional **Todo App** built with **Vite**, **React 18**, and **TypeScript** to demonstrate:
*   `createSagaAction` (AsyncThunk bridge)
*   `takeEveryAsync` (Awaitable actions)
*   `takeLatestAsync` (Cancellable search)
*   `putAsync` (Saga composition)

### Run Locally

```bash
cd example
npm install
npm run dev
```

### Try Online (StackBlitz)
> Note: Requires the package to be published to npm.

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/janoist1/saga-toolkit/tree/master/example)

## Installation

```bash
npm install saga-toolkit
# or
yarn add saga-toolkit
```

*Peer Dependencies: `@reduxjs/toolkit`, `redux-saga`*

## Usage Guide

### 1. Create a "Saga Action"

Instead of `createAsyncThunk` or standard action creators, use `createSagaAction`. This creates an Async Thunk that returns a promise which your Saga will resolve or reject.

```typescript
/* slice.ts */
import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { createSagaAction } from 'saga-toolkit'

interface User {
  id: string
  name: string
}

const name = 'users'

// Define the action: <Returned, ThunkArg>
export const fetchUser = createSagaAction<User, string>(`${name}/fetchUser`)

const slice = createSlice({
  name,
  initialState: { data: null as User | null, loading: false },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUser.pending, (state) => { state.loading = true })
      .addCase(fetchUser.fulfilled, (state, action: PayloadAction<User>) => {
        state.loading = false
        state.data = action.payload
      })
  },
})

export default slice.reducer
```

### 2. Connect to a Saga

Use `takeEveryAsync` (or `takeLatestAsync`, etc.) to listen for the action. Use the `SagaActionFromCreator` helper to type your worker sagas perfectly.

```typescript
/* sagas.ts */
import { call } from 'redux-saga/effects'
import { takeEveryAsync, SagaActionFromCreator } from 'saga-toolkit'
import { fetchUser } from './slice'

// helper for clean typing
function* fetchUserSaga(action: SagaActionFromCreator<typeof fetchUser>) {
  const userId = action.meta.arg
  
  // The return value here resolves the promise!
  const user = yield call(API.getUser, userId)
  return user 
}

export default function* rootSaga() {
  yield takeEveryAsync(fetchUser.pending.type, fetchUserSaga)
}
```

### 3. Dispatch and Await in Component

#### [Pro Tip] Use `bindActionCreators`
To keep your component code clean and avoid passing `dispatch` everywhere, we recommend using `bindActionCreators`.

```tsx
/* UserComponent.tsx */
import { useMemo } from 'react'
import { useDispatch } from 'react-redux'
import { bindActionCreators } from 'redux'
import { fetchUser } from './slice'

const UserComponent = ({ id }: { id: string }) => {
  const dispatch = useDispatch()
  
  // Bind actions once
  const actions = useMemo(() => bindActionCreators({ fetchUser }, dispatch), [dispatch])

  const handleFetch = async () => {
    try {
      // Clean awaitable call!
      const user = await actions.fetchUser(id).unwrap() 
      console.log('Got user:', user)
    } catch (error) {
      console.error('Failed to fetch:', error)
    }
  }

  return <button onClick={handleFetch}>Load User</button>
}
```

## API Reference

### `createSagaAction<Returned, ThunkArg>(typePrefix)`
Creates a Redux Toolkit Async Thunk bridge.
- **Returns**: An enhanced thunk action creator.

### `takeEveryAsync(pattern, saga, ...args)`
Spawns a `saga` on each action.
- Automatically resolves/rejects the promise associated with the action.

### `takeLatestAsync(pattern, saga, ...args)`
Same as `takeEveryAsync`, but cancels previous running task on new actions.
- Propagates cancellation to the saga and rejets the promise with "Aborted".

### `takeAggregateAsync(pattern, saga, ...args)`
Wait for the saga to finish. Subsequent identical actions dispatched while it's running will all share the **same promise result**.
- Perfect for de-duplicating rapid "Refresh" calls.

### `putAsync(action)`
Dispatches an action and waits for its Saga to finish.
- `const result = yield putAsync(otherAction())`

### `SagaActionFromCreator<typeof actionCreator>`
TypeScript helper to extract the correct action type for your Saga worker.

## License

ISC
