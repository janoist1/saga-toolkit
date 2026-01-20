import { useMemo } from 'react'
import { useDispatch } from 'react-redux'
import { bindActionCreators, ActionCreatorsMapObject } from 'redux'
import type { AsyncThunk } from '@reduxjs/toolkit'

type BoundAsyncThunk<Thunk extends AsyncThunk<any, any, any>> =
    Thunk extends AsyncThunk<infer Returned, infer ThunkArg, any>
    ? (arg: ThunkArg) => Promise<Returned>
    : never

type HookResult<M extends ActionCreatorsMapObject> = {
    [K in keyof M]: M[K] extends AsyncThunk<any, any, any>
    ? BoundAsyncThunk<M[K]>
    : M[K]
}

export const useSagaActions = <M extends ActionCreatorsMapObject>(actions: M): HookResult<M> => {
    const dispatch = useDispatch()
    return useMemo(() => {
        const bound = bindActionCreators(actions, dispatch)
        const wrapped: any = {}

        for (const key in bound) {
            wrapped[key] = async (...args: any[]) => {
                const res = bound[key](...args)
                // Check if it's an AsyncThunk action with unwrap
                if (res && typeof res === 'object' && 'unwrap' in res && typeof (res as any).unwrap === 'function') {
                    return await (res as any).unwrap()
                }
                return res
            }
        }
        return wrapped
    }, [actions, dispatch])
}
