import { call, race } from 'redux-saga/effects'
import { Request, SagaWorker, Deferred } from './types'

const requests: Record<string, Request> = {}

// How long a dispatched action may wait for a saga to pick it up before its promise is rejected
const UNHANDLED_TIMEOUT = 30000

export const createDeferred = <T = unknown>(): Deferred<T> => {
    let resolve!: (value: T) => void
    let reject!: (error: unknown) => void
    const promise = new Promise<T>((res, rej) => {
        resolve = res
        reject = rej
    })
    return { promise, resolve, reject }
}

export const addRequest = (requestId: string, type?: string, signal?: AbortSignal) => {
    const deferred = createDeferred()
    const existing = requests[requestId]

    if (existing) {
        existing.deferred = deferred
        existing.signal = signal
        existing.type = type
        if (existing.onAdd) {
            existing.onAdd(existing)
        }
    } else {
        requests[requestId] = {
            requestId,
            deferred,
            signal,
            type,
            handled: false,
        }
    }

    // Reject (instead of hanging forever) if no saga picks the action up in time
    const timer = setTimeout(() => {
        const request = requests[requestId]
        if (request && !request.handled) {
            delete requests[requestId]
            deferred.reject(new Error(
                `[saga-toolkit] Action "${type ?? requestId}" was not picked up by any saga within ${UNHANDLED_TIMEOUT / 1000}s. ` +
                'Did you forget to register it with takeEveryAsync / takeLatestAsync / takeAggregateAsync in your root saga?',
            ))
        }
    }, UNHANDLED_TIMEOUT)
    // Don't keep a Node.js process (SSR, tests) alive just for this watchdog
    if (typeof timer === 'object' && typeof (timer as { unref?: () => void }).unref === 'function') {
        (timer as unknown as { unref: () => void }).unref()
    }
    requests[requestId].timer = timer

    return deferred.promise
}

export const cleanup = (requestId: string) => {
    const request = requests[requestId]
    if (request && request.timer) {
        clearTimeout(request.timer)
    }
    delete requests[requestId]
}

/** @internal */
export const _clearInternalState = () => {
    for (const key in requests) {
        cleanup(key)
    }
}

export const setRequestAbort = (requestId: string, abort: (reason?: string) => void) => {
    if (requests[requestId]) {
        requests[requestId].abort = abort
    }
}

export const getRequestSync = (requestId: string): Request | undefined => {
    return requests[requestId]
}

export function* getRequest(requestId: string): Generator<unknown, Request, unknown> {
    const request = requests[requestId]

    if (request) {
        request.handled = true
    }

    if (!request) {
        const result = yield (new Promise(onAdd => {
            requests[requestId] = {
                onAdd: (req: Request) => onAdd(req),
                handled: true
            }
        }))
        return result as Request
    }

    return request
}

export const wrap = (saga: SagaWorker, mirror?: Deferred) => function* (action: unknown, ...rest: unknown[]): Generator<unknown, void, unknown> {
    const requestId = (action as { meta?: { requestId?: string } })?.meta?.requestId

    if (!requestId) {
        // Not a saga action (no thunk requestId) — run the worker without promise bridging
        yield saga(action, ...rest)
        return
    }

    let deferred: Deferred | undefined
    let signal: AbortSignal | undefined
    let onAbort: (() => void) | undefined
    let isFinished = false

    // `mirror` (used by takeAggregateAsync) is settled synchronously together with the request,
    // so joiners always observe the same outcome as the leader
    const resolve = (value: unknown) => {
        if (deferred) deferred.resolve(value)
        if (mirror) mirror.resolve(value)
    }
    const reject = (error: unknown) => {
        if (deferred) deferred.reject(error)
        if (mirror) mirror.reject(error)
    }

    // The whole body — including the wait in getRequest — runs under this try/finally, so a
    // cancellation at ANY point (e.g. takeLatestAsync superseding a same-tick sibling that is
    // still waiting for its request) always releases the registry entry and its watchdog timer
    try {
        const request = (yield getRequest(requestId)) as Request

        if (!request.deferred) {
            if (mirror) mirror.reject(new Error('Aborted'))
            isFinished = true
            return
        }

        deferred = request.deferred
        signal = request.signal

        if (signal && signal.aborted) {
            reject(new Error('Aborted'))
            isFinished = true
            return
        }

        if (signal) {
            // Race the worker against promise.abort() so cancellation reaches the saga
            const activeSignal = signal
            const abortPromise = new Promise<true>(res => {
                onAbort = () => res(true)
                activeSignal.addEventListener('abort', onAbort, { once: true })
            })
            const winner = (yield race({
                result: call(saga as (...args: unknown[]) => unknown, action, ...rest),
                aborted: call(() => abortPromise),
            })) as { result?: unknown, aborted?: true }

            if (winner.aborted) {
                reject(new Error('Aborted'))
            } else {
                resolve(winner.result)
            }
            isFinished = true
        } else {
            const result = yield saga(action, ...rest)
            resolve(result)
            isFinished = true
        }
    } catch (error) {
        reject(error)
        isFinished = true
    } finally {
        if (signal && onAbort) {
            signal.removeEventListener('abort', onAbort)
        }
        if (!isFinished) {
            // The task was cancelled — possibly while still waiting in getRequest,
            // so the deferred may have to be looked up now
            if (!deferred) {
                deferred = getRequestSync(requestId)?.deferred
            }
            reject(new Error('Aborted'))
            const currentRequest = requests[requestId]
            if (currentRequest && currentRequest.abort) {
                currentRequest.abort()
            }
        }
        cleanup(requestId)
    }
}

/** @internal */
export const _getInternalState = () => ({
    requests,
    size: Object.keys(requests).length
})
