import createDeferred from '@redux-saga/deferred'
import { createAsyncThunk, unwrapResult } from '@reduxjs/toolkit'
import type { AsyncThunk, ThunkDispatch } from '@reduxjs/toolkit'
import { put, take, fork, cancel } from 'redux-saga/effects'
import type { PutEffect, ActionPattern } from 'redux-saga/effects'
import type { Task, Channel } from 'redux-saga'
import type { Action } from 'redux'

// Generic definition for any saga worker
type SagaWorker = (...args: any[]) => any

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

        return (dispatch: ThunkDispatch<any, any, any>, getState: any, extra: any) => {
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type: (thunk.pending as any).type,
    })

    return actionCreator as unknown as SagaAction<Returned, ThunkArg>
}

const cleanup = (requestId: string) => {
    delete requests[requestId]
}

function* getRequest(requestId: string): Generator<any, Request, any> {
    const request = requests[requestId]

    if (!request) {
        return yield (new Promise(onAdd => {
            requests[requestId] = {
                onAdd: (req: Request) => onAdd(req)
            }
        }))
    }

    return request
}

const wrap = (saga: SagaWorker) => function* (action: any, ...rest: any[]): Generator<any, void, any> {
    const { requestId } = action.meta
    const request: Request = yield getRequest(requestId)

    if (!request.deferred) return

    const deferred = request.deferred

    try {
        const result: any = yield saga(action, ...rest)
        deferred.resolve(result)
    } catch (error) {
        deferred.reject(error)
    } finally {
        cleanup(requestId)
    }
}

// Helper to avoid 'takeEvery' overload issues with spread arguments
const takeEveryHelper = (patternOrChannel: ActionPattern | Channel<any>, worker: SagaWorker, ...args: any[]) => fork(function* () {
    while (true) {
        const action: any = yield take(patternOrChannel as any)
        yield fork(worker, ...args.concat(action))
    }
})

export function takeEveryAsync(pattern: ActionPattern | Channel<any>, saga: SagaWorker, ...args: any[]) {
    return takeEveryHelper(pattern, wrap(saga), ...args)
}

export function takeLatestAsync(pattern: ActionPattern | Channel<any>, saga: SagaWorker, ...args: any[]) {
    const tasks: Record<string, Deferred> = {}
    let deferred: Deferred | null

    function* wrapper(action: any, ...rest: any[]): Generator<any, void, any> {
        if (deferred) {
            const lastRequestId: string = yield deferred.promise
            const request: Request = yield getRequest(lastRequestId)

            if (request.abort) {
                request.abort()
            }

            const task: Task = yield tasks[lastRequestId].promise

            yield cancel(task)
        }

        deferred = createDeferred()
        const { requestId } = yield getRequest(action.meta.requestId)

        if (deferred) {
            deferred.resolve(requestId)
        }

        yield wrap(saga)(action, ...rest)

        deferred = null
    }

    const customTakeEvery = (patternOrChannel: ActionPattern | Channel<any>, saga: SagaWorker, ...args: any[]) => fork(function* (): Generator<any, void, any> {
        while (true) {
            const action = yield take(patternOrChannel as any)
            const { requestId } = action.meta
            tasks[requestId] = createDeferred()
            const task: Task = yield fork(saga, ...args.concat(action))
            tasks[requestId].resolve(task)
        }
    })

    return customTakeEvery(pattern, wrapper, ...args)
}

export function takeAggregateAsync(pattern: ActionPattern | Channel<any>, saga: SagaWorker, ...args: any[]) {
    let deferred: Deferred | null

    function* wrapper(action: any, ...rest: any[]): Generator<any, void, any> {
        const { requestId } = action.meta

        if (deferred) {
            const request: Request = yield getRequest(requestId)
            if (request.deferred) {
                const { resolve, reject } = request.deferred
                const { promise } = yield deferred.promise

                promise
                    .then(resolve, reject)
                    .finally(() => cleanup(requestId))
                    .catch(() => { })
            }
        } else {
            deferred = createDeferred()
            const request: Request = yield getRequest(requestId)
            if (request.deferred) {
                const { promise } = request.deferred

                yield wrap(saga)(action, ...rest)

                if (deferred) {
                    deferred.resolve({ promise })
                }
                deferred = null
            }
        }
    }

    return takeEveryHelper(pattern, wrapper, ...args)
}

export function* putAsync(action: Action | PutEffect): Generator<PutEffect | Promise<unknown>, unknown, unknown> {
    const promise = yield put(action as Action)
    const result = yield (promise as Promise<unknown>)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return unwrapResult(result as any)
}
