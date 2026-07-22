// @vitest-environment jsdom
/* eslint-disable require-yield */
import { createElement, ReactNode } from 'react'
import { Provider } from 'react-redux'
import { renderHook } from '@testing-library/react'
import { configureStore } from '@reduxjs/toolkit'
import createSagaMiddleware from 'redux-saga'
import { delay, cancelled } from 'redux-saga/effects'
import type { AnyAction } from 'redux'
import { describe, it, expect, beforeEach } from 'vitest'
import { createSagaAction, takeEveryAsync, useSagaActions } from '../src/index'
import { _clearInternalState, _getInternalState } from '../src/utils'

describe('useSagaActions', () => {
    beforeEach(() => {
        _clearInternalState()
    })

    const setup = (rootSaga: () => Generator) => {
        const seenActions: string[] = []
        const recorder = (state: object = {}, action: AnyAction) => {
            seenActions.push(action.type)
            return state
        }
        const sagaMiddleware = createSagaMiddleware()
        const store = configureStore({
            reducer: recorder,
            middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(sagaMiddleware),
        })
        sagaMiddleware.run(rootSaga)

        const wrapper = ({ children }: { children: ReactNode }) =>
            createElement(Provider, { store, children })

        return { store, wrapper, seenActions }
    }

    it('unwraps saga action results and keeps abort() reachable', async () => {
        const fetchThing = createSagaAction<string, number>('hook/fetchThing')

        function* saga(action: { type: string, meta: { arg: number } }) {
            return `thing-${action.meta.arg}`
        }

        function* rootSaga() {
            yield takeEveryAsync(fetchThing.pending.type, saga)
        }

        const { wrapper } = setup(rootSaga)
        const { result } = renderHook(() => useSagaActions({ fetchThing }), { wrapper })

        const promise = result.current.fetchThing(7)
        expect(typeof promise.abort).toBe('function')

        await expect(promise).resolves.toBe('thing-7')
    })

    it('abort() rejects the promise and cancels the saga', async () => {
        const fetchSlow = createSagaAction<string>('hook/fetchSlow')
        let wasCancelled = false

        function* saga(): Generator<unknown, string, unknown> {
            try {
                yield delay(200)
                return 'done'
            } finally {
                if (yield cancelled()) {
                    wasCancelled = true
                }
            }
        }

        function* rootSaga() {
            yield takeEveryAsync(fetchSlow.pending.type, saga)
        }

        const { wrapper } = setup(rootSaga)
        const { result } = renderHook(() => useSagaActions({ fetchSlow }), { wrapper })

        const promise = result.current.fetchSlow()
        await new Promise(resolve => setTimeout(resolve, 10))
        promise.abort()

        await expect(promise).rejects.toMatchObject({ name: 'AbortError' })
        await new Promise(resolve => setTimeout(resolve, 10))
        expect(wasCancelled).toBe(true)
        expect(_getInternalState().size).toBe(0)
    })

    it('returns plain (non-thunk) action creators as-is and dispatches them', () => {
        const plainAction = (value: number) => ({ type: 'hook/plain', payload: value })

        function* rootSaga() { /* nothing to watch */ }

        const { wrapper, seenActions } = setup(rootSaga)
        const { result } = renderHook(() => useSagaActions({ plainAction }), { wrapper })

        const returned = result.current.plainAction(42)

        // Plain creators must NOT be wrapped in a promise
        expect(returned).toEqual({ type: 'hook/plain', payload: 42 })
        expect(seenActions).toContain('hook/plain')
    })

    it('is referentially stable across re-renders with shallow-equal inputs', () => {
        const fetchThing = createSagaAction<string>('hook/stable')

        function* rootSaga() { /* nothing to watch */ }

        const { wrapper } = setup(rootSaga)
        const { result, rerender } = renderHook(
            ({ actions }: { actions: { fetchThing: typeof fetchThing } }) => useSagaActions(actions),
            { wrapper, initialProps: { actions: { fetchThing } } },
        )

        const first = result.current

        // New object literal, shallowly equal content — must not produce a new identity
        rerender({ actions: { fetchThing } })

        expect(result.current).toBe(first)
    })
})
