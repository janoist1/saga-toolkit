import { useMemo, useRef } from 'react'
import { useDispatch, shallowEqual } from 'react-redux'
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

function useShallowStable<T>(value: T): T {
    const ref = useRef(value)
    if (!shallowEqual(ref.current, value)) {
        ref.current = value
    }
    return ref.current
}

export const useSagaActions = <M extends ActionCreatorsMapObject>(actions: M): HookResult<M> => {
    const dispatch = useDispatch()
    // Ensure the actions object is referentially stable if its content is shallowly equal
    const stableActions = useShallowStable(actions)

    return useMemo(() => {
        const bound = bindActionCreators(stableActions, dispatch)
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
    }, [stableActions, dispatch])
}
