import { createAsyncThunk, unwrapResult } from '@reduxjs/toolkit'
import type { AsyncThunk } from '@reduxjs/toolkit'
import { put, take, fork, takeEvery, cancel } from 'redux-saga/effects'
import type { Task } from 'redux-saga'

// @ts-ignore: no types for this package
import createDeferred from '@redux-saga/deferred'

interface Deferred<T = any> {
    resolve: (value: T) => void
    reject: (error: any) => void
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createSagaAction = <Returned, ThunkArg = void>(type: string): SagaAction<Returned, ThunkArg> => {
    const thunk = createAsyncThunk<Returned, ThunkArg>(type, (_, { requestId }) => addRequest(requestId))

    function actionCreator(arg: ThunkArg) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const originalActionCreator = thunk(arg)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (dispatch: any, getState: any, extra: any) => {
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
        type: thunk.pending.type, // Saga usually listens to pending action
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
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onAdd: (req: Request) => onAdd(req)
            }
        }))
    }

    return request
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const wrap = (saga: (...args: any[]) => any) => function* (action: any, ...rest: any[]) {
    const { requestId } = action.meta
    const request: Request = yield getRequest(requestId)

    if (!request.deferred) return

    const deferred = request.deferred

    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result: any = yield saga(action, ...rest)
        deferred.resolve(result)
    } catch (error) {
        deferred.reject(error)
    } finally {
        cleanup(requestId)
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function takeEveryAsync(pattern: any, saga: (...args: any[]) => any, ...args: any[]) {
    return takeEvery(pattern, wrap(saga), ...args)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function takeLatestAsync(pattern: any, saga: (...args: any[]) => any, ...args: any[]) {
    const tasks: Record<string, Deferred> = {}
    let deferred: Deferred | null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function* wrapper(action: any, ...rest: any[]) {
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const customTakeEvery = (patternOrChannel: any, saga: any, ...args: any[]) => fork(function* () {
        while (true) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const action: any = yield take(patternOrChannel)
            const { requestId } = action.meta
            tasks[requestId] = createDeferred()
            const task: Task = yield fork(saga, ...args.concat(action))
            tasks[requestId].resolve(task)
        }
    })

    // @ts-ignore
    return customTakeEvery(pattern, wrapper, ...args)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function takeAggregateAsync(pattern: any, saga: (...args: any[]) => any, ...args: any[]) {
    let deferred: Deferred | null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function* wrapper(action: any, ...rest: any[]) {
        const { requestId } = action.meta

        if (deferred) {
            const request: Request = yield getRequest(requestId)
            if (request.deferred) {
                const { resolve, reject } = request.deferred
                const { promise } = yield deferred.promise

                promise
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    return takeEvery(pattern, wrapper, ...args)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function* putAsync(action: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return unwrapResult(yield (yield put(action)) as any)
}
