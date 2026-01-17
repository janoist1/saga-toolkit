import { AsyncThunk } from '@reduxjs/toolkit'

export type SagaWorker = (...args: unknown[]) => unknown

export interface Deferred<T = unknown> {
    resolve: (value: T) => void
    reject: (error: unknown) => void
    promise: Promise<T>
}

export interface Request {
    requestId?: string
    deferred?: Deferred
    onAdd?: (request: Request) => void
    abort?: () => void
}

export type SagaAction<Returned, ThunkArg = void> = AsyncThunk<Returned, ThunkArg, object>
