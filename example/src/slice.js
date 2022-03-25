import { createAction, createSlice } from '@reduxjs/toolkit'
import { createSagaAction } from 'saga-toolkit'

const name = 'root'

const initialState = {
  started: false,
  error: null,
}

export const start = createSagaAction(`${name}/start`)
export const fetchThings = createSagaAction(`${name}/fetchThings`)
export const fetchThingsDebounce = createSagaAction(`${name}/fetchThingsDebounce`)
export const click = createAction(`${name}/click`)

const slice = createSlice({
  name,
  initialState,
  reducers: {},
  extraReducers: {
    [start.fulfilled]: () => ({
      started: true,
    }),
    [start.rejected]: ({ error }) => ({
      error,
    }),
  },
})

export const { } = slice.actions

export default slice.reducer
