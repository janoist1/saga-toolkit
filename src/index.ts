import { createAsyncThunk } from '@reduxjs/toolkit'
import type { ThunkDispatch } from '@reduxjs/toolkit'
import type { Action } from 'redux'
import { addRequest, setRequestAbort } from './utils'
import { SagaAction } from './types'

export * from './types'
export * from './effects'
export * from './hooks'

export const createSagaAction = <Returned, ThunkArg = void>(type: string): SagaAction<Returned, ThunkArg> => {
    const thunk = createAsyncThunk<Returned, ThunkArg>(type, (_, { requestId }) => addRequest(requestId) as Promise<Returned>)

    function actionCreator(arg: ThunkArg) {
        const originalActionCreator = thunk(arg)

        return (dispatch: ThunkDispatch<unknown, unknown, Action>, getState: () => unknown, extra: unknown) => {
            const promise = originalActionCreator(dispatch, getState, extra)
            if (promise.requestId) {
                setRequestAbort(promise.requestId, promise.abort)
            }

            return promise
        }
    }

    Object.assign(actionCreator, {
        pending: thunk.pending,
        rejected: thunk.rejected,
        fulfilled: thunk.fulfilled,
        typePrefix: thunk.typePrefix,
        type: (thunk.pending as unknown as { type: string }).type,
    })

    return actionCreator as unknown as SagaAction<Returned, ThunkArg>
}
