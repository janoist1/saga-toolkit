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

import { useRef } from 'react'

function shallowEqual(objA: any, objB: any) {
    if (objA === objB) return true
    if (!objA || !objB || typeof objA !== 'object' || typeof objB !== 'object') return false

    const keysA = Object.keys(objA)
    const keysB = Object.keys(objB)

    if (keysA.length !== keysB.length) return false

    for (const key of keysA) {
        if (objA[key] !== objB[key]) return false
    }
    return true
}

export const useSagaActions = <M extends ActionCreatorsMapObject>(actions: M): HookResult<M> => {
    const dispatch = useDispatch()
    const actionsRef = useRef(actions)

    if (!shallowEqual(actionsRef.current, actions)) {
        actionsRef.current = actions
    }

    return useMemo(() => {
        const bound = bindActionCreators(actionsRef.current, dispatch)
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
    }, [actionsRef.current, dispatch])
}
