export const __esModule: boolean;
export function putAsync(action: any): Generator<any, any, any>;
export function takeAggregateAsync(pattern: any, saga: any, ...args: any[]): any;
export function takeEveryAsync(pattern: any, saga: any, ...args: any[]): any;
export function takeLatestAsync(pattern: any, saga: any, ...args: any[]): any;
export function createSagaAction(type: any): {
    (...args: any[]): (...args: any[]) => Promise<_toolkit.PayloadAction<any, string, {
        arg: void;
        requestId: string;
        requestStatus: "fulfilled";
    }, never> | _toolkit.PayloadAction<unknown, string, {
        arg: void;
        requestId: string;
        requestStatus: "rejected";
        aborted: boolean;
        condition: boolean;
    } & ({
        rejectedWithValue: true;
    } | ({
        rejectedWithValue: false;
    } & {})), _toolkit.SerializedError>> & {
        abort: (reason?: string) => void;
        requestId: string;
        arg: void;
        unwrap: () => Promise<any>;
    };
    pending: import("@reduxjs/toolkit/dist/createAsyncThunk").AsyncThunkPendingActionCreator<void, {}>;
    rejected: import("@reduxjs/toolkit/dist/createAsyncThunk").AsyncThunkRejectedActionCreator<void, {}>;
    fulfilled: import("@reduxjs/toolkit/dist/createAsyncThunk").AsyncThunkFulfilledActionCreator<any, void, {}>;
    typePrefix: string;
    type: import("@reduxjs/toolkit/dist/createAsyncThunk").AsyncThunkPendingActionCreator<void, {}>;
};
import _toolkit = require("@reduxjs/toolkit");
//# sourceMappingURL=index.d.ts.map