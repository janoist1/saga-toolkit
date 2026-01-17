import { configureStore, createReducer } from '@reduxjs/toolkit'
import createSagaMiddleware from 'redux-saga'
import { delay, spawn } from 'redux-saga/effects'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createSagaAction, takeEveryAsync, takeLatestAsync, putAsync, takeAggregateAsync } from '../src/index'
import { _getInternalState, _clearInternalState } from '../src/utils'

describe('saga-toolkit', () => {
    beforeEach(() => {
        _clearInternalState()
    })

    const createStore = (rootSaga: () => Generator) => {
        const sagaMiddleware = createSagaMiddleware()
        const store = configureStore({
            reducer: createReducer({}, () => { }),
            middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(sagaMiddleware),
        })
        sagaMiddleware.run(rootSaga)
        return store
    }

    it('should resolve promise when saga returns', async () => {
        const action = createSagaAction<string, string>('test/action')

        // Listening to pending action: args are in meta.arg
        function* saga(action: { type: string, meta: { arg: string } }) {
            return `Processed ${action.meta.arg}`
        }

        function* rootSaga() {
            yield takeEveryAsync(action.pending.type, saga)
        }

        const store = createStore(rootSaga)
        const result = await store.dispatch(action('data')).unwrap()

        expect(result).toBe('Processed data')
    })

    it('should reject promise when saga throws', async () => {
        const action = createSagaAction('test/error')

        function* saga() {
            throw new Error('Boom')
        }

        function* rootSaga() {
            yield takeEveryAsync(action.pending.type, saga)
        }

        const store = createStore(rootSaga)

        await expect(store.dispatch(action()).unwrap()).rejects.toThrow('Boom')
    })

    it('should support putAsync', async () => {
        const action1 = createSagaAction<string>('test/action1')
        const action2 = createSagaAction<string>('test/action2')

        function* saga2() {
            return 'Result 2'
        }

        function* saga1() {
            const result: string = yield putAsync(action2())
            return `Result 1 + ${result}`
        }

        function* rootSaga() {
            yield takeEveryAsync(action1.pending.type, saga1)
            yield takeEveryAsync(action2.pending.type, saga2)
        }

        const store = createStore(rootSaga)
        const result = await store.dispatch(action1()).unwrap()

        expect(result).toBe('Result 1 + Result 2')
    })

    it('takeLatestAsync should cancel previous request', async () => {
        const action = createSagaAction('test/latest')

        function* saga() {
            yield delay(100)
            return 'done'
        }

        function* rootSaga() {
            yield takeLatestAsync(action.pending.type, saga)
        }

        const store = createStore(rootSaga)

        const p1 = store.dispatch(action())
        const p2 = store.dispatch(action())

        await expect(p2.unwrap()).resolves.toBe('done')

        try {
            await p1.unwrap()
        } catch (e: any) {
            // Redux Toolkit serialization might make it a plain object
            const message = e.message || (typeof e === 'string' ? e : JSON.stringify(e))
            expect(message).toMatch(/Aborted/i)
        }
    })

    it('should support takeAggregateAsync (running multiple requests)', async () => {
        const action = createSagaAction<string, number>('test/aggregate')

        function* saga(action: { type: string, meta: { arg: number } }) {
            yield delay(50)
            return `Result ${action.meta.arg}`
        }

        function* rootSaga() {
            yield takeAggregateAsync(action.pending.type, saga)
        }

        const store = createStore(rootSaga)

        const p1 = store.dispatch(action(1))
        const p2 = store.dispatch(action(1))

        const results = await Promise.all([p1.unwrap(), p2.unwrap()])

        expect(results[0]).toBe('Result 1')
        expect(results[1]).toBe('Result 1')
    })

    describe('Memory Leaks', () => {
        beforeEach(() => {
            vi.useFakeTimers()
        })

        afterEach(() => {
            vi.useRealTimers()
        })

        it('takeLatestAsync should not leak tasks or requests', async () => {
            const action = createSagaAction('test/leak/latest')
            function* saga() {
                yield delay(100)
                return 'done'
            }
            function* rootSaga() {
                yield takeLatestAsync(action.pending.type, saga)
            }
            const store = createStore(rootSaga)

            // Dispatch many actions
            for (let i = 0; i < 100; i++) {
                store.dispatch(action())
                // Advance timers and allow microtasks to run
                await vi.advanceTimersByTimeAsync(10)
            }

            // Internal state should only track ONE active request/task
            expect(_getInternalState().size).toBe(1)

            // After delay, should be 0
            await vi.advanceTimersByTimeAsync(200)
            expect(_getInternalState().size).toBe(0)
        })

        it('unhandled actions should auto-cleanup after 30s', async () => {
            const action = createSagaAction('test/leak/unhandled')
            const store = configureStore({
                reducer: createReducer({}, () => { }),
            })

            store.dispatch(action())
            expect(_getInternalState().size).toBe(1)

            // Advance 31 seconds
            vi.advanceTimersByTime(31000)
            expect(_getInternalState().size).toBe(0)
        })
    })
})
