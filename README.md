# Saga Toolkit

An extension for [redux-toolkit][redux-toolkit] that allows sagas to resolve async thunk actions. 🌝

## install

`npm i saga-toolkit`

## example

`slice.js`
```js
import { createSlice } from '@reduxjs/toolkit'
import { createSagaAction  } from 'saga-toolkit'

const name = 'example'

const initialState = {
  started: false,
  result: null,
  loading: false,
  error: null,
}

export const appStart = createSagaAction(`${name}/appStart`)
export const fetchThings = createSagaAction(`${name}/fetchThings`)

const slice = createSlice({
  name,
  initialState,
  extraReducers: {
    [fetchThings.pending]: state => ({
      ...state,
      loading: true,
    }),
    [fetchThings.fulfilled]: (state, { payload }) => ({
      ...state,
      result: payload,
      loading: false,
    }),
    [fetchThings.rejected]: (state, { payload }) => ({
      ...state,
      error,
      loading: false,
    }),
    [appStart.fulfilled]: state => {
      state.started = true // immer allows this
      return state
    },
  },
})

export default slice.reducer
```

`sagas.js`
```js
import { put, call } from 'redux-saga/effects'
import { takeEveryAsync, putAsync } from 'saga-toolkit'
import API from 'hyper-super-api'
import * as actions from './slice'

function* appStart() {
  const promise = yield put(fetchThings({ someArg: 'example' }))
  try {
    const fetchThingsActionFulfulled = yield promise // optionally we can wait for an action to finish and get its result
  } catch(error) {
    // we can handle error to avoid appStart to get rejected if we want
  }
  return result
}

// or using putAsync
function* appStart() {
  try {
    const payload = yield putAsync(fetchThings({ someArg: 'example' }))
  } catch(error) {
    // handle uncatched error from saga
  }
  return result
}

function* fetchThings({ meta }) {
  const { someArg } = meta
  const result = yield call(() => API.get('/things', { body: someArg }))
  return result
}

export default [
  takeEveryAsync(actions.appStart.type, appStart),
  takeEveryAsync(actions.fetchThings.type, fetchThings),
]
```

`SomeComponent.js`
```js
// import things

const SomeComponent() {
  const dispatch = useDispatch()

  useEffect(() => {
    const promise = dispatch(appStart()) // dispatch action from component
    promise.then(...).catch(...) // optionally do something with promise
  }, [])

  return (
    ...
  )
}
```

[redux-toolkit]: https://redux-toolkit.js.org/ "redux-toolkit"
