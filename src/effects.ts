import { put, take, fork, cancel } from 'redux-saga/effects'
import type { PutEffect, ActionPattern, ForkEffect } from 'redux-saga/effects'
import type { Task, Channel } from 'redux-saga'
import type { Action } from 'redux'
import { AsyncThunkAction, unwrapResult } from '@reduxjs/toolkit'
import { SagaWorker, Request, SagaAction, SagaPendingAction } from './types'
import { wrap, getRequest, getRequestSync, cleanup, createDeferred } from './utils'

/** Worker saga signature enforced by the type-safe (action creator) overloads. */
type SagaActionWorker<Returned, ThunkArg> = (
    action: SagaPendingAction<SagaAction<Returned, ThunkArg>>,
    ...args: any[]
) => Generator<any, Returned, any> | Promise<Returned>

// Accepts either a saga action creator (listens on its `pending` type) or a regular pattern
const resolvePattern = (patternOrCreator: unknown): ActionPattern | Channel<Action> => {
    const maybeCreator = patternOrCreator as { pending?: { type?: unknown } }
    if (typeof patternOrCreator === 'function' && maybeCreator.pending && typeof maybeCreator.pending.type === 'string') {
        return maybeCreator.pending.type
    }
    return patternOrCreator as ActionPattern | Channel<Action>
}

// Helper to avoid 'takeEvery' overload issues with spread arguments.
// Note: the action is passed FIRST, extra args after — matching the declared saga signatures.
const takeEveryHelper = (patternOrChannel: ActionPattern | Channel<Action>, worker: SagaWorker, ...args: unknown[]) => fork(function* () {
    while (true) {
        const action = (yield take(patternOrChannel as unknown as ActionPattern)) as Action
        yield fork(worker as (...workerArgs: unknown[]) => unknown, action, ...args)
    }
})

export function takeEveryAsync<Returned, ThunkArg>(
    creator: SagaAction<Returned, ThunkArg>,
    saga: SagaActionWorker<Returned, ThunkArg>,
    ...args: unknown[]
): ForkEffect<never>
export function takeEveryAsync<A extends Action = Action>(
    pattern: ActionPattern<A> | Channel<A>,
    saga: (action: A, ...args: unknown[]) => unknown,
    ...args: unknown[]
): ForkEffect<never>
export function takeEveryAsync(patternOrCreator: unknown, saga: (...args: any[]) => unknown, ...args: unknown[]): ForkEffect<never> {
    return takeEveryHelper(resolvePattern(patternOrCreator), wrap(saga as SagaWorker), ...args) as ForkEffect<never>
}

export function takeLatestAsync<Returned, ThunkArg>(
    creator: SagaAction<Returned, ThunkArg>,
    saga: SagaActionWorker<Returned, ThunkArg>,
    ...args: unknown[]
): ForkEffect<never>
export function takeLatestAsync<A extends Action = Action>(
    pattern: ActionPattern<A> | Channel<A>,
    saga: (action: A, ...args: unknown[]) => unknown,
    ...args: unknown[]
): ForkEffect<never>
export function takeLatestAsync(patternOrCreator: unknown, saga: (...args: any[]) => unknown, ...args: unknown[]): ForkEffect<never> {
    const pattern = resolvePattern(patternOrCreator)

    return fork(function* () {
        let lastTask: Task | null = null
        let lastRequestId: string | null = null

        while (true) {
            const action = (yield take(pattern as unknown as ActionPattern)) as { meta?: { requestId?: string } }
            const requestId = action?.meta?.requestId

            if (lastTask) {
                if (lastRequestId) {
                    const lastRequest = getRequestSync(lastRequestId)
                    if (lastRequest && lastRequest.abort) {
                        lastRequest.abort()
                    }
                }
                yield cancel(lastTask)
            }

            lastRequestId = requestId ?? null
            const worker = wrap(saga as SagaWorker)
            lastTask = (yield fork(worker, action, ...args)) as Task
        }
    }) as ForkEffect<never>
}

// Dedup key for takeAggregateAsync: actions with the same (structurally equal) arg share one run.
// Args that can't be JSON-serialized (circular refs, functions, symbols, bigints…) must never
// collide with each other, so objects/functions fall back to identity-based keys and anything
// else opts out of deduplication entirely (returns null).
let identitySeq = 0
const identityKeys = new WeakMap<object, string>()
const argKey = (arg: unknown): string | null => {
    if (arg === undefined) return '<undefined>'
    try {
        const json = JSON.stringify(arg)
        if (json !== undefined) return json
    } catch { /* not serializable */ }
    if ((typeof arg === 'object' && arg !== null) || typeof arg === 'function') {
        let key = identityKeys.get(arg as object)
        if (!key) {
            key = `<identity:${++identitySeq}>`
            identityKeys.set(arg as object, key)
        }
        return key
    }
    return null
}

export function takeAggregateAsync<Returned, ThunkArg>(
    creator: SagaAction<Returned, ThunkArg>,
    saga: SagaActionWorker<Returned, ThunkArg>,
    ...args: unknown[]
): ForkEffect<never>
export function takeAggregateAsync<A extends Action = Action>(
    pattern: ActionPattern<A> | Channel<A>,
    saga: (action: A, ...args: unknown[]) => unknown,
    ...args: unknown[]
): ForkEffect<never>
export function takeAggregateAsync(patternOrCreator: unknown, saga: (...args: any[]) => unknown, ...args: unknown[]): ForkEffect<never> {
    const inFlight = new Map<string, Promise<unknown>>()

    function* wrapper(action: unknown, ...rest: unknown[]): Generator<unknown, void, unknown> {
        const meta = (action as { meta?: { requestId?: string, arg?: unknown } })?.meta
        const requestId = meta?.requestId

        if (!requestId) {
            // Not a saga action — run the worker without promise bridging
            yield (saga as SagaWorker)(action, ...rest)
            return
        }

        const key = argKey(meta?.arg)

        if (key === null) {
            // Arg has no safe identity — run without deduplication
            yield wrap(saga as SagaWorker)(action, ...rest)
            return
        }

        const existing = inFlight.get(key)

        if (existing) {
            // A run with the same arg is in flight — share its result
            const request = (yield getRequest(requestId)) as Request
            if (request.deferred) {
                const { resolve, reject } = request.deferred
                existing.then(resolve, reject).finally(() => cleanup(requestId))
            }
            return
        }

        // Leader: register the shared promise synchronously (before any yield!) so
        // actions dispatched in the same tick join instead of starting their own run
        const shared = createDeferred()
        shared.promise.catch(() => { }) // outcome reaches consumers through their own request promises
        inFlight.set(key, shared.promise)
        try {
            // wrap() settles `shared` synchronously together with the leader's own request
            yield wrap(saga as SagaWorker, shared)(action, ...rest)
        } finally {
            inFlight.delete(key)
            // Safety net: if the leader task died without settling (can't normally happen), unblock joiners
            shared.reject(new Error('Aborted'))
        }
    }

    return takeEveryHelper(resolvePattern(patternOrCreator), wrapper, ...args) as ForkEffect<never>
}

export function* putAsync<Returned = unknown>(
    action: Action | PutEffect | AsyncThunkAction<Returned, unknown, object>,
): Generator<PutEffect | Promise<unknown>, Returned, unknown> {
    const promise = yield put(action as Action)
    const result = yield (promise as Promise<unknown>)
    return unwrapResult(result as { payload: Returned, error?: unknown, meta?: unknown }) as Returned
}
