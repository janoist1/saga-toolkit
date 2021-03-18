# Saga Toolkit

An extension for [[redux-toolkit]][redux-toolkit] that allows sagas to resolve async thunk actions. 🌝

## install

`npm i saga-toolkit`

## example

`slice.js`
```js
import { createSlice } from '@reduxjs/toolkit'
import { createSagaAction  } from 'saga-toolkit'

const name = 'example'

const initialState = {
  result: null,
  loading: false,
  error: null,
}

export const fetchThings = createSagaAction(`${name}/fetchThings`)

const slice = createSlice({
  name,
  initialState,
  extraReducers: {
    [fetchThings.pending]: () => ({
      loading: true,
    }),
    [fetchThings.fulfilled]: ({ payload }) => ({
	  result: payload,
      loading: false,
    }),
    [fetchThings.rejected]: ({ error }) => ({
	  error,
      loading: false,
    }),
  },
})

export default slice.reducer
```

`sagas.js`
```js
import { call } from 'redux-saga/effects'
import { takeLatestAsync } from 'saga-toolkit'
import API from 'hyper-super-api'
import * as actions from './slice'

function* fetchThings() {
  const result = yield call(() => API.get('/things'))
  return result
}

export default [
  takeLatestAsync(actions.fetchThings.type, fetchThings),
]
```

[redux-toolkit]: https://redux-toolkit.js.org/ "redux-toolkit"