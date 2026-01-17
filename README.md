# Saga Toolkit

**Seamlessly integrate Redux Toolkit with Redux Saga.**

`saga-toolkit` acts as a bridge between Redux Toolkit's `createAsyncThunk` and Redux Saga. It allows you to dispatch actions that trigger Sagas, while retaining the ability to `await` the result (promise) directly in your components or thunks.

If you love the "fire-and-forget" nature of Sagas for complex flows but miss the convenience of `await dispatch(action)` for simple request/response patterns (like form submissions), this library is for you.

## Features

- 🤝 **Bridge Pattern**: Connects `createAsyncThunk` (RTK) with `takeEvery` / `takeLatest` (Saga).
- 🔄 **Promise Support**: `await` your Saga actions in React components.
- ⚡ **Reduce Boilerplate**: Easily handle loading/success/error states in slices using standard RTK patterns.
- 🛑 **Cancellation**: Propagates cancellation from the promise to the Saga.

## Installation

```bash
npm install saga-toolkit
# or
yarn add saga-toolkit
```

*Peer Dependencies: `@reduxjs/toolkit`, `redux-saga`*

## Usage Guide

### 1. Create a "Saga Action"

Instead of `createAsyncThunk` or standard standard action creators, use `createSagaAction`. This creates a thunk that returns a promise which your Saga will resolve or reject.

```javascript
/* slice.js */
import { createSlice } from '@reduxjs/toolkit'
import { createSagaAction } from 'saga-toolkit'

const name = 'users'

// Define the action
export const fetchUser = createSagaAction(`${name}/fetchUser`)

const initialState = {
  data: null,
  loading: false,
  error: null,
}

const slice = createSlice({
  name,
  initialState,
  extraReducers: (builder) => {
    builder
      .addCase(fetchUser.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchUser.fulfilled, (state, { payload }) => {
        state.loading = false
        state.data = payload
      })
      .addCase(fetchUser.rejected, (state, { error }) => {
        state.loading = false
        state.error = error
      })
  },
})

export default slice.reducer
```

### 2. Connect to a Saga

Use `takeEveryAsync` (or `takeLatestAsync`, etc.) to listen for the action. The return value of your saga becomes the `fulfilled` payload. Throwing an error becomes the `rejected` payload.

```javascript
/* sagas.js */
import { call } from 'redux-saga/effects'
import { takeEveryAsync } from 'saga-toolkit'
import { fetchUser } from './slice'
import API from './api'

function* fetchUserSaga({ meta }) {
  // meta.arg contains the argument passed to the dispatch
  const userId = meta.arg
  
  // The return value here resolves the promise!
  const user = yield call(API.getUser, userId)
  return user 
}

export default function* rootSaga() {
  yield takeEveryAsync(fetchUser.type, fetchUserSaga)
}
```

### 3. Dispatch and Await in Component

Now you can treat the Saga logic as if it were a simple async function.

```javascript
/* UserComponent.jsx */
import { useDispatch } from 'react-redux'
import { useEffect } from 'react'
import { fetchUser } from './slice'

const UserComponent = ({ id }) => {
  const dispatch = useDispatch()

  const handleFetch = async () => {
    try {
      // This waits for the Saga to finish!
      const user = await dispatch(fetchUser(id)).unwrap() 
      console.log('Got user:', user)
    } catch (error) {
      console.error('Failed to fetch:', error)
    }
  }

  return <button onClick={handleFetch}>Load User</button>
}
```

## API Reference

### `createSagaAction(typePrefix)`
Creates a Redux Toolkit Async Thunk that is specially designed to work with the effects below.
- **Returns**: An enhanced thunk action creator.

### `takeEveryAsync(pattern, saga, ...args)`
Spawns a `saga` on each action dispatched to the Store that matches `pattern`.
- Automatically resolves the promise associated with the action when the saga returns.
- Automatically rejects the promise if the saga errors.

### `takeLatestAsync(pattern, saga, ...args)`
Same as `takeEveryAsync`, but cancels any previous running task if a new matching action is dispatched.
- **Note**: Cancelled tasks will reject the promise with an "Aborted" error (or similar).

### `takeAggregateAsync(pattern, saga, ...args)`
Wait for the saga to finish for the first action. If subsequent actions with the same pattern are dispatched *while only one is running*, they will all share the **same promise result** as the first one.
- Useful for de-duplicating identical requests (e.g., multiple components requesting "load config" simultaneously).

### `putAsync(action)`
Dispatches an action to the store and waits for the result.
- Useful when you want to call another saga-action from within a saga and wait for it (composition).
- **Example**: `const result = yield putAsync(otherAction())`

## License

ISC
