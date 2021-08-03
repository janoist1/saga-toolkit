"use strict";

exports.__esModule = true;
exports.putAsync = putAsync;
exports.takeAggregateAsync = exports.takeLatestAsync = exports.takeEveryAsync = exports.createSagaAction = void 0;

var _toolkit = require("@reduxjs/toolkit");

var _effects = require("@redux-saga/core/effects");

var _deferred = _interopRequireDefault(require("@redux-saga/deferred"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const requests = {};

const addRequest = requestId => {
  const deferred = (0, _deferred.default)();

  if (requests[requestId]) {
    requests[requestId].deferred = deferred;
    requests[requestId].onAdd(deferred);
  } else {
    requests[requestId] = {
      deferred
    };
  }

  return deferred.promise;
};

const createSagaAction = type => {
  const action = (0, _toolkit.createAsyncThunk)(type, async (_, {
    requestId
  }) => addRequest(requestId));
  action.type = action.pending;
  return action;
};

exports.createSagaAction = createSagaAction;

const takeAsync = ({
  latest = false,
  aggregate = false
}) => (patternOrChannel, saga, ...args) => (0, _effects.fork)(function* () {
  const queue = [];

  function* processQueue() {
    let task;

    while (queue.length) {
      const action = queue.shift();
      const {
        requestId
      } = action.meta;
      const request = requests[requestId];
      let deferred;

      if (!request) {
        deferred = yield new Promise(onAdd => {
          requests[requestId] = {
            onAdd
          };
        });
      } else {
        deferred = request.deferred;
      }

      const {
        resolve,
        reject
      } = deferred;

      if (latest && task && !(yield (0, _effects.cancelled)(task))) {
        yield (0, _effects.cancel)(task);
      }

      function* wrap(saga, ...args) {
        try {
          resolve(yield (0, _effects.call)(saga, ...args));
        } catch (error) {
          reject(error);
        } finally {
          if (yield (0, _effects.cancelled)()) {
            reject('Saga cancelled');
          }
        }
      }

      if (aggregate && task) {
        requests[task.requestId].deferred.promise.then(resolve).catch(reject);
      } else {
        task = yield (0, _effects.fork)(wrap, saga, ...args.concat(action));
        task.requestId = requestId;
      }

      requests[task.requestId].deferred.promise.finally(() => {
        delete requests[requestId];
      }).catch(() => undefined);
    }
  }

  let processor;

  while (true) {
    var _processor;

    const action = yield (0, _effects.take)(patternOrChannel);
    const {
      requestId
    } = action === null || action === void 0 ? void 0 : action.meta;

    if (!requestId) {
      throw Error('Non-saga action');
    }

    queue.push(action);

    if (!((_processor = processor) !== null && _processor !== void 0 && _processor.isRunning())) {
      processor = yield (0, _effects.fork)(processQueue);
    }
  }
});

const takeEveryAsync = takeAsync({});
exports.takeEveryAsync = takeEveryAsync;
const takeLatestAsync = takeAsync({
  latest: true
});
exports.takeLatestAsync = takeLatestAsync;
const takeAggregateAsync = takeAsync({
  aggregate: true
});
exports.takeAggregateAsync = takeAggregateAsync;

function* putAsync(action) {
  return (0, _toolkit.unwrapResult)(yield yield (0, _effects.put)(action));
}
