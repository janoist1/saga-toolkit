// generated with chatGPT

import { ThunkAction } from '@reduxjs/toolkit'

declare module 'saga-toolkit' {
  import { Dispatch } from 'redux'
  import { SagaIterator } from 'redux-saga'
  import { AsyncThunkFulfilledActionCreator, AsyncThunkConfig } from '@reduxjs/toolkit/src/createAsyncThunk'

  type AsyncSagaPayloadCreator<Returned, ThunkArg = void> = (
    arg: ThunkArg,
    requestId: string
  ) => Promise<Returned>

  type AsyncSagaActionCreator<
    Returned,
    ThunkArg,
    ThunkApiConfig extends AsyncThunkConfig = {}
  > = (
    arg: ThunkArg
  ) => ThunkAction<
    Promise<Returned>,
    ReturnType<Dispatch>,
    unknown,
    ReturnType<
      AsyncThunkFulfilledActionCreator<Returned, ThunkArg, ThunkApiConfig>
    >
  >

  export interface AsyncSagaThunkConfig {
    requestId: string
    signal: AbortSignal
    abort: (reason?: string) => void
  }

  export function createSagaAction<Returned, ThunkArg = void>(
    type: string
  ): AsyncSagaActionCreator<Returned, ThunkArg> & {
    pending: string;
    fulfilled: string;
    rejected: string;
    typePrefix: string;
    type: string;
  }

  type SagaFunction<Args extends any[]> = (...args: Args) => SagaIterator;

  export function takeEveryAsync<ActionPattern>(
    pattern: ActionPattern,
    saga: SagaFunction<[...args: any[]]>,
    ...args: any[]
  ): void;

  export function takeLatestAsync<ActionPattern>(
    pattern: ActionPattern,
    saga: SagaFunction<[...args: any[]]>,
    ...args: any[]
  ): void;

  export function takeAggregateAsync<ActionPattern>(
    pattern: ActionPattern,
    saga: SagaFunction<[...args: any[]]>,
    ...args: any[]
  ): void;

  export function putAsync<T>(action: T): T;

  // export function takeEveryAsync(pattern: any, saga: any, ...args: any[]): any
  // export function takeLatestAsync(pattern: any, saga: any, ...args: any[]): any
  // export function takeAggregateAsync(pattern: any, saga: any, ...args: any[]): any
  // export function putAsync(action: any): any
}
