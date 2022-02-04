"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createSagaAction = void 0;
exports.putAsync = putAsync;
exports.takeAggregateAsync = takeAggregateAsync;
exports.takeEveryAsync = takeEveryAsync;
exports.takeLatestAsync = takeLatestAsync;

var _toolkit = require("@reduxjs/toolkit");

var _effects = require("@redux-saga/core/effects");

var _deferred = _interopRequireDefault(require("@redux-saga/deferred"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const requests = {};

const addRequest = requestId => {
  const deferred = (0, _deferred.default)();
  const request = { ...requests[requestId],
    requestId,
    deferred
  };

  if (requests[requestId]) {
    requests[requestId].deferred = deferred;
    requests[requestId].onAdd(request);
  } else {
    requests[requestId] = request;
  }

  return deferred.promise;
};

const createSagaAction = type => {
  const thunk = (0, _toolkit.createAsyncThunk)(type, (_, {
    requestId
  }) => addRequest(requestId));

  function actionCreator(...args) {
    const originalActionCreator = thunk(...args);
    return (...args) => {
      const promise = originalActionCreator(...args);
      requests[promise.requestId].abort = promise.abort;
      return promise;
    };
  }

  actionCreator.pending = thunk.pending;
  actionCreator.rejected = thunk.rejected;
  actionCreator.fulfilled = thunk.fulfilled;
  actionCreator.typePrefix = thunk.typePrefix;
  actionCreator.type = thunk.pending;
  return actionCreator;
};

exports.createSagaAction = createSagaAction;

const cleanup = requestId => {
  delete requests[requestId];
};

function* getRequest(requestId) {
  // const { requestId } = action.meta
  const request = requests[requestId];

  if (!request) {
    return yield new Promise(onAdd => {
      requests[requestId] = {
        onAdd
      };
    });
  }

  return request;
}

const wrap = saga => function* (action, ...rest) {
  const {
    requestId
  } = action.meta;
  const request = yield getRequest(requestId);
  const deferred = request.deferred;

  try {
    deferred.resolve(yield saga(action, ...rest));
  } catch (error) {
    console.log(error);
    deferred.reject(error);
  } finally {
    cleanup(requestId);
  }
};

function takeEveryAsync(pattern, saga, ...args) {
  return (0, _effects.takeEvery)(pattern, wrap(saga), ...args);
}

function takeLatestAsync(pattern, saga, ...args) {
  const tasks = {};
  let deferred;

  function* wrapper(action, ...rest) {
    if (deferred) {
      const lastRequestId = yield deferred.promise;
      const request = yield getRequest(lastRequestId);
      request.abort();
      const task = yield tasks[lastRequestId].promise;
      yield (0, _effects.cancel)(task);
    }

    deferred = (0, _deferred.default)();
    const {
      requestId
    } = yield getRequest(action.meta.requestId);
    deferred.resolve(requestId);
    yield wrap(saga)(action, ...rest);
    deferred = null;
  }

  const takeEvery = (patternOrChannel, saga, ...args) => (0, _effects.fork)(function* () {
    while (true) {
      const action = yield (0, _effects.take)(patternOrChannel);
      const {
        requestId
      } = action.meta;
      tasks[requestId] = (0, _deferred.default)();
      tasks[requestId].resolve(yield (0, _effects.fork)(saga, ...args.concat(action)));
    }
  });

  return takeEvery(pattern, wrapper, ...args);
}

function takeAggregateAsync(pattern, saga, ...args) {
  let deferred;

  function* wrapper(action, ...rest) {
    const {
      requestId
    } = action.meta;

    if (deferred) {
      const request = yield getRequest(requestId);
      const {
        resolve,
        reject
      } = request.deferred;
      const {
        promise
      } = yield deferred.promise;
      promise.then(resolve, reject).finally(() => cleanup(requestId)).catch(() => {});
    } else {
      deferred = (0, _deferred.default)();
      const request = yield getRequest(requestId);
      const {
        promise
      } = request.deferred;
      yield wrap(saga)(action, ...rest);
      deferred.resolve({
        promise
      });
      deferred = null;
    }
  }

  return (0, _effects.takeEvery)(pattern, wrapper, ...args);
}

function* putAsync(action) {
  return (0, _toolkit.unwrapResult)(yield yield (0, _effects.put)(action));
}
