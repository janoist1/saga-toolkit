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
    abort?: (reason?: string) => void
    signal?: AbortSignal
    timer?: ReturnType<typeof setTimeout>
    type?: string
    task?: any // Using any to avoid circular dependency with Task from redux-saga
    onAdd?: (request: Request) => void
    handled?: boolean
}

export type SagaAction<Returned, ThunkArg = void> = AsyncThunk<Returned, ThunkArg, object>

export type SagaActionFromCreator<T extends (...args: any[]) => any> = ReturnType<ReturnType<T>['pending']>

/** Pending action dispatched by a saga action creator — what your worker saga receives. */
export type SagaPendingAction<C extends AsyncThunk<any, any, any>> = ReturnType<C['pending']>
