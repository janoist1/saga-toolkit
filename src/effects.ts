import { put, take, fork, cancel } from 'redux-saga/effects'
import type { PutEffect, ActionPattern } from 'redux-saga/effects'
import type { Task, Channel } from 'redux-saga'
import type { Action } from 'redux'
import createDeferred from '@redux-saga/deferred'
import { AsyncThunkAction, unwrapResult } from '@reduxjs/toolkit'
import { SagaWorker, Deferred, Request } from './types'
import { wrap, getRequest, getRequestSync, cleanup } from './utils'

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
    return fork(function* () {
        let lastTask: Task | null = null
        let lastRequestId: string | null = null

        while (true) {
            const action = (yield take(pattern as unknown as ActionPattern)) as { meta: { requestId: string } }
            const { requestId } = action.meta

            if (lastTask) {
                if (lastRequestId) {
                    const lastRequest = getRequestSync(lastRequestId)
                    if (lastRequest && lastRequest.abort) {
                        lastRequest.abort()
                    }
                }
                yield cancel(lastTask)
            }

            lastRequestId = requestId
            const worker = wrap(saga as unknown as SagaWorker)
            lastTask = (yield fork(worker as any, ...args.concat(action))) as Task
        }
    })
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
