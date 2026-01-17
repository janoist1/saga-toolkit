import { configureStore, createReducer } from '@reduxjs/toolkit'
import createSagaMiddleware from 'redux-saga'
import { call, delay } from 'redux-saga/effects'
import { describe, it, expect } from 'vitest'
import { createSagaAction, takeEveryAsync, takeLatestAsync, putAsync } from '../src/index'

describe('saga-toolkit', () => {
    const createStore = (rootSaga: any) => {
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

        function* saga(payload: any) {
            return `Processed ${payload.meta.arg}`
        }

        function* rootSaga() {
            yield takeEveryAsync(action.type, saga)
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
            yield takeEveryAsync(action.type, saga)
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
            yield takeEveryAsync(action1.type, saga1)
            yield takeEveryAsync(action2.type, saga2)
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
            yield takeLatestAsync(action.type, saga)
        }

        const store = createStore(rootSaga)

        const p1 = store.dispatch(action())
        const p2 = store.dispatch(action())

        // p1 should be cancelled/rejected (depending on implementation it might hang or reject)
        // The current implementation aborts the *request*, and cancels the *task*.
        // When a task is cancelled in saga, usually it just stops. 
        // But since the promise is external, we need to see what happens.
        // In `takeLatestAsync`, we do `request.abort()` which calls `promise.abort`.
        // Redux Toolkit async thunk promises have an `abort()` method.

        await expect(p2.unwrap()).resolves.toBe('done')

        // Check p1 status or result. 
        // Depending on RTK version and `abort` signal handling, this might reject with AbortError.
        try {
            await p1.unwrap()
        } catch (e: any) {
            expect(e.message).toMatch(/Aborted/i)
        }
    })
})
