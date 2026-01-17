import createDeferred from '@redux-saga/deferred'
import { Request, SagaWorker } from './types'

const requests: Record<string, Request> = {}

export const addRequest = (requestId: string) => {
    const deferred = createDeferred()
    const request: Request = {
        ...requests[requestId],
        requestId,
        deferred,
        handled: false
    }

    if (requests[requestId]) {
        requests[requestId].deferred = deferred
        if (requests[requestId].onAdd) {
            requests[requestId].onAdd(request)
        }
    } else {
        requests[requestId] = request
    }

    // Auto-cleanup if not picked up by a saga within 30 seconds
    setTimeout(() => {
        if (requests[requestId] && !requests[requestId].handled) {
            delete requests[requestId]
        }
    }, 30000)

    return deferred.promise
}

export const cleanup = (requestId: string) => {
    delete requests[requestId]
}

/** @internal */
export const _clearInternalState = () => {
    for (const key in requests) {
        delete requests[key]
    }
}

export const setRequestAbort = (requestId: string, abort: () => void) => {
    if (requests[requestId]) {
        requests[requestId].abort = abort
    }
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

export const wrap = (saga: SagaWorker) => function* (action: unknown, ...rest: unknown[]): Generator<unknown, void, unknown> {
    const { requestId } = (action as { meta: { requestId: string } }).meta
    const request = (yield getRequest(requestId)) as Request

    if (!request.deferred) return

    const deferred = request.deferred
    let isFinished = false

    try {
        const result = yield saga(action, ...rest)
        deferred.resolve(result)
        isFinished = true
    } catch (error) {
        deferred.reject(error)
        isFinished = true
    } finally {
        if (!isFinished) {
            deferred.reject(new Error('Aborted'))
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
