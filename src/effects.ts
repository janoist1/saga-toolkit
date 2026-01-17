import { put, take, fork, cancel } from 'redux-saga/effects'
import type { PutEffect, ActionPattern } from 'redux-saga/effects'
import type { Task, Channel } from 'redux-saga'
import type { Action } from 'redux'
import createDeferred from '@redux-saga/deferred'
import { AsyncThunkAction, unwrapResult } from '@reduxjs/toolkit'
import { SagaWorker, Deferred, Request } from './types'
import { wrap, getRequest, cleanup } from './utils'

// Helper to avoid 'takeEvery' overload issues with spread arguments
const takeEveryHelper = (patternOrChannel: ActionPattern | Channel<Action>, worker: SagaWorker, ...args: unknown[]) => fork(function* () {
    while (true) {
        const action = (yield take(patternOrChannel as unknown as ActionPattern)) as Action
        yield fork(worker, ...args.concat(action))
    }
})

export function takeEveryAsync<A extends Action = Action>(pattern: ActionPattern<A> | Channel<A>, saga: (action: A, ...args: unknown[]) => unknown, ...args: unknown[]) {
    return takeEveryHelper(pattern as ActionPattern | Channel<Action>, wrap(saga as unknown as SagaWorker), ...args)
}

export function takeLatestAsync<A extends Action = Action>(pattern: ActionPattern<A> | Channel<A>, saga: (action: A, ...args: unknown[]) => unknown, ...args: unknown[]) {
    const tasks: Record<string, Deferred> = {}
    let deferred: Deferred | null

    function* wrapper(action: unknown, ...rest: unknown[]): Generator<unknown, void, unknown> {
        if (deferred) {
            const lastRequestId = (yield deferred.promise) as string
            const request = (yield getRequest(lastRequestId)) as Request

            if (request.abort) {
                request.abort()
            }

            const task = (yield tasks[lastRequestId].promise) as Task

            yield cancel(task)
        }

        deferred = createDeferred()
        const { requestId } = (action as { meta: { requestId: string } }).meta

        yield getRequest(requestId) // Ensure request is registered/ready if needed

        if (deferred) {
            deferred.resolve(requestId)
        }

        yield wrap(saga as unknown as SagaWorker)(action, ...rest)

        deferred = null
    }

    const customTakeEvery = (patternOrChannel: ActionPattern | Channel<Action>, saga: SagaWorker, ...args: unknown[]) => fork(function* (): Generator<unknown, void, unknown> {
        while (true) {
            const action = (yield take(patternOrChannel as unknown as ActionPattern)) as { meta: { requestId: string } }
            const { requestId } = action.meta
            tasks[requestId] = createDeferred()
            const task = (yield fork(saga, ...args.concat(action))) as Task
            tasks[requestId].resolve(task)
        }
    })

    return customTakeEvery(pattern as ActionPattern | Channel<Action>, wrapper, ...args)
}

export function takeAggregateAsync<A extends Action = Action>(pattern: ActionPattern<A> | Channel<A>, saga: (action: A, ...args: unknown[]) => unknown, ...args: unknown[]) {
    let deferred: Deferred | null

    function* wrapper(action: unknown, ...rest: unknown[]): Generator<unknown, void, unknown> {
        const { requestId } = (action as { meta: { requestId: string } }).meta

        if (deferred) {
            const request = (yield getRequest(requestId)) as Request
            if (request.deferred) {
                const { resolve, reject } = request.deferred
                const { promise } = (yield deferred.promise) as { promise: Promise<unknown> }

                promise
                    .then(resolve, reject)
                    .finally(() => cleanup(requestId))
                    .catch(() => { })
            }
        } else {
            deferred = createDeferred()
            const request = (yield getRequest(requestId)) as Request
            if (request.deferred) {
                const { promise } = request.deferred

                yield wrap(saga as unknown as SagaWorker)(action, ...rest)

                if (deferred) {
                    deferred.resolve({ promise })
                }
                deferred = null
            }
        }
    }

    return takeEveryHelper(pattern as ActionPattern | Channel<Action>, wrapper, ...args)
}

export function* putAsync(action: Action | PutEffect | AsyncThunkAction<unknown, unknown, object>): Generator<PutEffect | Promise<unknown>, unknown, unknown> {
    const promise = yield put(action as Action)
    const result = yield (promise as Promise<unknown>)
    return unwrapResult(result as { payload: unknown, error?: unknown, meta?: unknown })
}
