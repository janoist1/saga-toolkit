/* eslint-disable require-yield */
import { configureStore, createReducer } from '@reduxjs/toolkit'
import createSagaMiddleware from 'redux-saga'
import { delay, cancelled } from 'redux-saga/effects'
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

    // For tests dispatching non-serializable args (circular refs, functions) —
    // RTK's serializable/immutable dev checks would drown the output otherwise
    const createStoreLoose = (rootSaga: () => Generator) => {
        const sagaMiddleware = createSagaMiddleware()
        const store = configureStore({
            reducer: createReducer({}, () => { }),
            middleware: (getDefaultMiddleware) => getDefaultMiddleware({
                serializableCheck: false,
                immutableCheck: false,
            }).concat(sagaMiddleware),
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

    it('should accept the action creator itself as pattern (typed overload)', async () => {
        const action = createSagaAction<string, number>('test/creatorPattern')

        function* saga(act: { meta: { arg: number } }) {
            return `n=${act.meta.arg}`
        }

        function* rootSaga() {
            yield takeEveryAsync(action, saga)
        }

        const store = createStore(rootSaga)
        const result = await store.dispatch(action(5)).unwrap()

        expect(result).toBe('n=5')
    })

    it('should pass extra args after the action', async () => {
        const action = createSagaAction<string>('test/extraArgs')

        function* saga(_act: unknown, extra1: unknown, extra2: unknown) {
            return `${extra1}-${extra2}`
        }

        function* rootSaga() {
            yield takeEveryAsync(action.pending.type, saga, 'A', 'B')
        }

        const store = createStore(rootSaga)
        const result = await store.dispatch(action()).unwrap()

        expect(result).toBe('A-B')
    })

    it('should run workers for plain (non-saga) actions without promise bridging', async () => {
        let seen: string | null = null

        function* saga(act: { type: string }) {
            seen = act.type
        }

        function* rootSaga() {
            yield takeEveryAsync('plain/action', saga)
        }

        const store = createStore(rootSaga)
        store.dispatch({ type: 'plain/action' })

        expect(seen).toBe('plain/action')
        expect(_getInternalState().size).toBe(0)
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

        // The superseded request MUST reject — a resolved p1 would mean cancellation never happened
        await expect(p1.unwrap()).rejects.toMatchObject({ name: 'AbortError' })
    })

    it('should support takeAggregateAsync (same arg shares one run)', async () => {
        const action = createSagaAction<string, number>('test/aggregate')
        let calls = 0

        function* saga(action: { type: string, meta: { arg: number } }) {
            calls++
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
        expect(calls).toBe(1)
    })

    it('takeAggregateAsync should NOT share results between different args', async () => {
        const action = createSagaAction<string, number>('test/aggregateArgs')
        let calls = 0

        function* saga(action: { type: string, meta: { arg: number } }) {
            calls++
            yield delay(50)
            return `Result ${action.meta.arg}`
        }

        function* rootSaga() {
            yield takeAggregateAsync(action.pending.type, saga)
        }

        const store = createStore(rootSaga)

        const p1 = store.dispatch(action(1))
        const p2 = store.dispatch(action(2))
        const p3 = store.dispatch(action(1))

        const [r1, r2, r3] = await Promise.all([p1.unwrap(), p2.unwrap(), p3.unwrap()])

        expect(r1).toBe('Result 1')
        expect(r2).toBe('Result 2')
        expect(r3).toBe('Result 1')
        expect(calls).toBe(2)
    })

    it('takeAggregateAsync: distinct non-serializable args must NOT share results', async () => {
        type Circular = { id: number, self?: unknown }
        const action = createSagaAction<number, Circular>('test/aggregateCircular')
        let calls = 0

        function* saga(action: { type: string, meta: { arg: Circular } }) {
            calls++
            yield delay(50)
            return action.meta.arg.id
        }

        function* rootSaga() {
            yield takeAggregateAsync(action.pending.type, saga)
        }

        const store = createStoreLoose(rootSaga)

        const a: Circular = { id: 1 }
        a.self = a
        const b: Circular = { id: 2 }
        b.self = b

        const p1 = store.dispatch(action(a))
        const p2 = store.dispatch(action(b))

        const [r1, r2] = await Promise.all([p1.unwrap(), p2.unwrap()])

        expect(r1).toBe(1)
        expect(r2).toBe(2)
        expect(calls).toBe(2)
    })

    it('takeAggregateAsync: the SAME non-serializable arg instance is still deduplicated', async () => {
        type Circular = { id: number, self?: unknown }
        const action = createSagaAction<number, Circular>('test/aggregateIdentity')
        let calls = 0

        function* saga(action: { type: string, meta: { arg: Circular } }) {
            calls++
            yield delay(50)
            return action.meta.arg.id
        }

        function* rootSaga() {
            yield takeAggregateAsync(action.pending.type, saga)
        }

        const store = createStoreLoose(rootSaga)

        const shared: Circular = { id: 7 }
        shared.self = shared

        const p1 = store.dispatch(action(shared))
        const p2 = store.dispatch(action(shared))

        const [r1, r2] = await Promise.all([p1.unwrap(), p2.unwrap()])

        expect(r1).toBe(7)
        expect(r2).toBe(7)
        expect(calls).toBe(1)
    })

    it('takeAggregateAsync: args without safe identity (bigint) opt out of dedup', async () => {
        const action = createSagaAction<string, bigint>('test/aggregateBigint')
        let calls = 0

        function* saga(action: { type: string, meta: { arg: bigint } }) {
            calls++
            yield delay(50)
            return `Result ${action.meta.arg}`
        }

        function* rootSaga() {
            yield takeAggregateAsync(action.pending.type, saga)
        }

        const store = createStoreLoose(rootSaga)

        const p1 = store.dispatch(action(1n))
        const p2 = store.dispatch(action(1n))

        const [r1, r2] = await Promise.all([p1.unwrap(), p2.unwrap()])

        expect(r1).toBe('Result 1')
        expect(r2).toBe('Result 1')
        expect(calls).toBe(2) // no dedup — each dispatch ran its own saga
        expect(_getInternalState().size).toBe(0)
    })

    it('takeAggregateAsync also runs workers for plain (non-saga) actions', async () => {
        let seen: string | null = null

        function* saga(act: { type: string }) {
            seen = act.type
        }

        function* rootSaga() {
            yield takeAggregateAsync('plain/aggregate', saga)
        }

        const store = createStore(rootSaga)
        store.dispatch({ type: 'plain/aggregate' })

        expect(seen).toBe('plain/aggregate')
        expect(_getInternalState().size).toBe(0)
    })

    describe('Cancellation', () => {
        beforeEach(() => {
            vi.useFakeTimers()
        })

        afterEach(() => {
            vi.useRealTimers()
        })

        it('abort() before the saga starts prevents it from running at all', async () => {
            const action = createSagaAction('test/abortEarly')
            let calls = 0

            function* saga() {
                calls++
                yield delay(100)
                return 'done'
            }

            function* rootSaga() {
                yield takeEveryAsync(action.pending.type, saga)
            }

            const store = createStore(rootSaga)

            const promise = store.dispatch(action())
            promise.abort() // same tick — the worker hasn't picked the request up yet

            await expect(promise.unwrap()).rejects.toMatchObject({ name: 'AbortError' })
            await vi.advanceTimersByTimeAsync(10)

            expect(calls).toBe(0)
            expect(_getInternalState().size).toBe(0)
            expect(vi.getTimerCount()).toBe(0)
        })

        it('aborting the dispatched promise cancels the running saga', async () => {
            const action = createSagaAction('test/abort')
            let wasCancelled = false
            let finished = false

            function* saga(): Generator<unknown, string, unknown> {
                try {
                    yield delay(1000)
                    finished = true
                    return 'done'
                } finally {
                    if (yield cancelled()) {
                        wasCancelled = true
                    }
                }
            }

            function* rootSaga() {
                yield takeEveryAsync(action.pending.type, saga)
            }

            const store = createStore(rootSaga)
            const promise = store.dispatch(action())

            await vi.advanceTimersByTimeAsync(10)
            promise.abort()
            await vi.advanceTimersByTimeAsync(10)

            expect(wasCancelled).toBe(true)
            expect(finished).toBe(false)
            await expect(promise.unwrap()).rejects.toMatchObject({ name: 'AbortError' })

            // Internal state must be cleaned up too
            expect(_getInternalState().size).toBe(0)
        })
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

        it('unhandled actions should auto-cleanup after 30s AND reject with a helpful error', async () => {
            const action = createSagaAction('test/leak/unhandled')
            const store = configureStore({
                reducer: createReducer({}, () => { }),
            })

            const promise = store.dispatch(action())
            expect(_getInternalState().size).toBe(1)

            // Advance 31 seconds
            await vi.advanceTimersByTimeAsync(31000)
            expect(_getInternalState().size).toBe(0)

            // The promise must not hang forever — it rejects with an actionable message
            await promise.unwrap().then(
                () => { throw new Error('expected rejection') },
                (e: { message?: string }) => {
                    expect(String(e.message)).toMatch(/was not picked up by any saga/)
                    expect(String(e.message)).toContain('test/leak/unhandled')
                },
            )
        })

        it('clears the TTL watchdog timer once a request completes', async () => {
            const action = createSagaAction<string>('test/leak/timers')
            function* saga() {
                return 'instant'
            }
            function* rootSaga() {
                yield takeEveryAsync(action.pending.type, saga)
            }
            const store = createStore(rootSaga)

            const promise = store.dispatch(action())
            await vi.advanceTimersByTimeAsync(1)
            await expect(promise.unwrap()).resolves.toBe('instant')

            // No lingering 30s watchdog timers
            expect(vi.getTimerCount()).toBe(0)
        })

        it('takeLatestAsync must not leak registry entries when superseded in the same tick', async () => {
            const action = createSagaAction('test/leak/sameTick')
            function* saga() {
                yield delay(50)
                return 'done'
            }
            function* rootSaga() {
                yield takeLatestAsync(action.pending.type, saga)
            }
            const store = createStore(rootSaga)

            // Second dispatch supersedes the first while its worker is still
            // waiting for the request to be registered (same tick!)
            store.dispatch(action())
            const p2 = store.dispatch(action())

            await vi.advanceTimersByTimeAsync(100)
            await expect(p2.unwrap()).resolves.toBe('done')

            // Both the superseded and the completed entry must be gone — forever, not after TTL
            expect(_getInternalState().size).toBe(0)
            expect(vi.getTimerCount()).toBe(0)
        })

        it('takeLatestAsync should not hang after previous request is cleaned up (TTL)', async () => {
            const action = createSagaAction('test/hang/latest')
            let calls = 0
            function* saga() {
                calls++
                yield delay(100)
            }
            function* rootSaga() {
                yield takeLatestAsync(action.pending.type, saga)
            }
            const sagaMiddleware = createSagaMiddleware()
            const store = configureStore({
                reducer: createReducer({}, () => { }),
                middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(sagaMiddleware),
            })
            sagaMiddleware.run(rootSaga)

            // 1. First call
            store.dispatch(action())
            await vi.advanceTimersByTimeAsync(150) // Allow to finish
            expect(calls).toBe(1)

            // 2. Wait for TTL cleanup
            await vi.advanceTimersByTimeAsync(35000)
            expect(_getInternalState().size).toBe(0)

            // 3. Second call - should NOT hang and should work
            store.dispatch(action())
            await vi.advanceTimersByTimeAsync(150)
            expect(calls).toBe(2)
        })
    })
})
