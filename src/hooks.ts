import { useMemo, useRef } from 'react'
import { useDispatch, shallowEqual } from 'react-redux'
import { bindActionCreators, ActionCreatorsMapObject } from 'redux'
import type { AsyncThunk } from '@reduxjs/toolkit'

/** Unwrapped thunk promise that still exposes the thunk's abort(). */
export type AbortablePromise<T> = Promise<T> & { abort: (reason?: string) => void }

type BoundSagaAction<Thunk extends AsyncThunk<any, any, any>> =
    Thunk extends AsyncThunk<infer Returned, infer ThunkArg, any>
    ? (arg: ThunkArg) => AbortablePromise<Returned>
    : never

type HookResult<M extends ActionCreatorsMapObject> = {
    [K in keyof M]: M[K] extends AsyncThunk<any, any, any>
    ? BoundSagaAction<M[K]>
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
        const wrapped: Record<string, unknown> = {}

        for (const key in bound) {
            const creator = bound[key] as (...args: unknown[]) => unknown
            wrapped[key] = (...args: unknown[]) => {
                const result = creator(...args)
                // AsyncThunk dispatch result: unwrap it but keep abort() reachable
                if (result && typeof result === 'object' && 'unwrap' in result
                    && typeof (result as { unwrap: unknown }).unwrap === 'function') {
                    const thunkResult = result as { unwrap: () => Promise<unknown>, abort?: (reason?: string) => void }
                    const promise = thunkResult.unwrap() as AbortablePromise<unknown>
                    if (typeof thunkResult.abort === 'function') {
                        promise.abort = (reason?: string) => thunkResult.abort!(reason)
                    }
                    return promise
                }
                // Plain action creators are returned as-is (already dispatched by bindActionCreators)
                return result
            }
        }
        return wrapped as HookResult<M>
    }, [stableActions, dispatch])
}
