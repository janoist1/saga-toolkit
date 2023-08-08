import { createAsyncThunk, ThunkAction, SerializedError, Action } from '@reduxjs/toolkit';
import { ForkEffect, PutEffect, TakeEffect, Saga, CallEffect, ForkEffectDescriptor } from '@redux-saga/core/effects';
import { Deferred } from '@redux-saga/deferred';

declare module 'saga-toolkit' {
  type SagaAction<Arg, ReturnType> = ThunkAction<
    Promise<ReturnType<Arg>>,
    unknown,
    { requestId: string },
    Action<string>
  > & {
    type: string;
    requestId: string;
    abort: () => void;
    then: (onfulfilled?: (value: SagaActionResult<Arg, ReturnType>) => void) => Promise<SagaActionResult<Arg, ReturnType>>;
  };

  interface IRequest {
    requestId: string;
    deferred: Deferred<any>;
    onAdd?: (request: IRequest) => void;
    abort?: () => void;
  }

  export type SagaActionResult<Arg, ReturnType> = {
    payload: ReturnType;
    meta: {
      requestId: string;
      arg: Arg;
    };
    error?: SerializedError;
  }

  export function createSagaAction<PayloadType, ReturnType = void>(
    type: string
  ): {  
    (payload: PayloadType): SagaAction<PayloadType, ReturnType>;
    pending: string;
    rejected: string;
    fulfilled: string;
    typePrefix: string;
    type: string;
  };

  export function* getRequest(requestId: string): Generator<CallEffect, IRequest, any>;

  export function takeEveryAsync<ActionPattern extends string>(
    pattern: ActionPattern,
    saga: Saga<[], void>,
    ...args: any[]
  ): ForkEffect<void>;

  export function takeLatestAsync<ActionPattern extends string>(
    pattern: ActionPattern,
    saga: Saga<[], void>,
    ...args: any[]
  ): ForkEffect<void>;

  export function takeAggregateAsync<ActionPattern extends string>(
    pattern: ActionPattern,
    saga: Saga<[], void>,
    ...args: any[]
  ): ForkEffect<void>;

  export function* putAsync<T>(
    action: SagaAction<T>
  ): Generator<PutEffect<SagaAction<T>>, any, any>;

  export type SagaActionFromCreator<Creator extends (...args: any) => any> = SagaActionResult<
    Parameters<Creator>[0],
    void
  > & {
    action: string
  }
}
