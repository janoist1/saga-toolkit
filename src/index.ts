import createDeferred from '@redux-saga/deferred'
import { createAsyncThunk, unwrapResult } from '@reduxjs/toolkit'
import type { AsyncThunk, ThunkDispatch, AsyncThunkAction } from '@reduxjs/toolkit'
import { put, take, fork, cancel } from 'redux-saga/effects'
import type { PutEffect, ActionPattern } from 'redux-saga/effects'
import type { Task, Channel } from 'redux-saga'
import type { Action } from 'redux'

// Generic definition for any saga worker
// We allow strict typing for workers by using unknown[] but workers often expect strict args.
// Typescript allows assigning (action: A) => ... to (...args: unknown[]) => ... IF defined correctly.
type SagaWorker = (...args: unknown[]) => unknown

interface Deferred<T = unknown> {
    resolve: (value: T) => void
    reject: (error: unknown) => void
    promise: Promise<T>
}

interface Request {
    requestId?: string
    deferred?: Deferred
    onAdd?: (request: Request) => void
    abort?: () => void
}

const requests: Record<string, Request> = {}

const addRequest = (requestId: string) => {
    const deferred = createDeferred()
    const request: Request = {
        ...requests[requestId],
        requestId,
        deferred,
    }

    if (requests[requestId]) {
        requests[requestId].deferred = deferred
        if (requests[requestId].onAdd) {
            requests[requestId].onAdd(request)
        }
    } else {
        requests[requestId] = request
    }

    return deferred.promise
}

export type SagaAction<Returned, ThunkArg = void> = AsyncThunk<Returned, ThunkArg, object>

export const createSagaAction = <Returned, ThunkArg = void>(type: string): SagaAction<Returned, ThunkArg> => {
    const thunk = createAsyncThunk<Returned, ThunkArg>(type, (_, { requestId }) => addRequest(requestId) as Promise<Returned>)

    function actionCreator(arg: ThunkArg) {
        const originalActionCreator = thunk(arg)

        return (dispatch: ThunkDispatch<unknown, unknown, Action>, getState: () => unknown, extra: unknown) => {
            const promise = originalActionCreator(dispatch, getState, extra)
            if (requests[promise.requestId]) {
                requests[promise.requestId].abort = promise.abort
            }

            return promise
        }
    }

    Object.assign(actionCreator, {
        pending: thunk.pending,
        rejected: thunk.rejected,
        fulfilled: thunk.fulfilled,
        typePrefix: thunk.typePrefix,
        type: (thunk.pending as unknown as { type: string }).type,
    })

    return actionCreator as unknown as SagaAction<Returned, ThunkArg>
}

const cleanup = (requestId: string) => {
    delete requests[requestId]
}

function* getRequest(requestId: string): Generator<unknown, Request, unknown> {
    const request = requests[requestId]

    if (!request) {
        const result = yield (new Promise(onAdd => {
            requests[requestId] = {
                onAdd: (req: Request) => onAdd(req)
            }
        }))
        return result as Request
    }

    return request
}

const wrap = (saga: SagaWorker) => function* (action: unknown, ...rest: unknown[]): Generator<unknown, void, unknown> {
    const { requestId } = (action as { meta: { requestId: string } }).meta
    const request = (yield getRequest(requestId)) as Request

    if (!request.deferred) return

    const deferred = request.deferred

    try {
        const result = yield saga(action, ...rest)
        deferred.resolve(result)
    } catch (error) {
        deferred.reject(error)
    } finally {
        cleanup(requestId)
    }
}

// Helper to avoid 'takeEvery' overload issues with spread arguments
const takeEveryHelper = (patternOrChannel: ActionPattern | Channel<Action>, worker: SagaWorker, ...args: unknown[]) => fork(function* () {
    while (true) {
        const action = (yield take(patternOrChannel as unknown as ActionPattern)) as Action
        yield fork(worker, ...args.concat(action))
    }
})

// We revert SagaWorker to any[] because validation of saga match is tricky with strict unknown
// But we keep internal implementation clean.
// Updated generics for usage comfort:

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
