import { createAsyncThunk, unwrapResult } from '@reduxjs/toolkit'
import { put, take, fork, takeEvery, cancel } from '@redux-saga/core/effects'
import createDeferred from '@redux-saga/deferred'

const requests = {}

const addRequest = requestId => {
  const deferred = createDeferred()
  const request = {
    ...requests[requestId],
    requestId,
    deferred,
  }

  if (requests[requestId]) {
    requests[requestId].deferred = deferred
    requests[requestId].onAdd(request)
  } else {
    requests[requestId] = request
  }

  return deferred.promise
}

export const createSagaAction = type => {
  const thunk = createAsyncThunk(type, (_, { requestId }) => addRequest(requestId))

  function actionCreator(...args) {
    const originalActionCreator = thunk(...args)

    return (...args) => {
      const promise = originalActionCreator(...args)
      requests[promise.requestId].abort = promise.abort

      return promise
    }
  }

  actionCreator.pending = thunk.pending
  actionCreator.rejected = thunk.rejected
  actionCreator.fulfilled = thunk.fulfilled
  actionCreator.typePrefix = thunk.typePrefix
  actionCreator.type = thunk.pending

  return actionCreator
}

const cleanup = requestId => {
  delete requests[requestId]
}

function* getRequest(requestId) {
  const request = requests[requestId]

  if (!request) {
    return yield (new Promise(onAdd => {
      requests[requestId] = { onAdd }
    }))
  }

  return request
}

const wrap = saga => function* (action, ...rest) {
  const { requestId } = action.meta
  const request = yield getRequest(requestId)
  const deferred = request.deferred

  try {
    deferred.resolve(yield saga(action, ...rest))
  } catch (error) {
    deferred.reject(error)
  } finally {
    cleanup(requestId)
  }
}

export function takeEveryAsync(pattern, saga, ...args) {
  return takeEvery(pattern, wrap(saga), ...args)
}

export function takeLatestAsync(pattern, saga, ...args) {
  const tasks = {}
  let deferred

  function* wrapper(action, ...rest) {
    if (deferred) {
      const lastRequestId = yield deferred.promise
      const request = yield getRequest(lastRequestId)

      request.abort()

      const task = yield tasks[lastRequestId].promise

      yield cancel(task)
    }

    deferred = createDeferred()
    const { requestId } = yield getRequest(action.meta.requestId)

    deferred.resolve(requestId)

    yield wrap(saga)(action, ...rest)

    deferred = null
  }

  const takeEvery = (patternOrChannel, saga, ...args) => fork(function* () {
    while (true) {
      const action = yield take(patternOrChannel)
      const { requestId } = action.meta
      tasks[requestId] = createDeferred()
      tasks[requestId].resolve(yield fork(saga, ...args.concat(action)))
    }
  })

  return takeEvery(pattern, wrapper, ...args)
}

export function takeAggregateAsync(pattern, saga, ...args) {
  let deferred

  function* wrapper(action, ...rest) {
    const { requestId } = action.meta

    if (deferred) {
      const request = yield getRequest(requestId)
      const { resolve, reject } = request.deferred
      const { promise } = yield deferred.promise

      promise
        .then(resolve, reject)
        .finally(() => cleanup(requestId))
        .catch(() => { })
    } else {
      deferred = createDeferred()
      const request = yield getRequest(requestId)
      const { promise } = request.deferred

      yield wrap(saga)(action, ...rest)

      deferred.resolve({ promise })
      deferred = null
    }
  }

  return takeEvery(pattern, wrapper, ...args)
}

export function* putAsync(action) {
  return unwrapResult(yield (yield put(action)))
}
