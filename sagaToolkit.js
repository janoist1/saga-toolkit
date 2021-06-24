import { createAsyncThunk, unwrapResult } from '@reduxjs/toolkit'
import { call, cancel, cancelled, fork, take, put } from 'redux-saga/effects'

const createDeferredForSaga = () => {
  const deferred = {}

  deferred.promise = new Promise((resolve, reject) => {
    deferred.resolve = resolve
    deferred.reject = error => {
      error?.message === 'Saga cancelled' ? resolve() : reject(error)
    }
  })

  return deferred
}

const requests = {}

const addRequest = requestId => {
  const deferred = createDeferredForSaga()

  if (requests[requestId]) {
    requests[requestId].deferred = deferred
    requests[requestId].onAdd(deferred)
  } else {
    requests[requestId] = { deferred }
  }

  return deferred.promise
}

export const createSagaAction = type => {
  const action = createAsyncThunk(type, (_, { requestId }) => {
    return addRequest(requestId)
  })

  action.type = action.pending

  return action
}

const takeAsync = (latest = false) => (patternOrChannel, saga, ...args) =>
  fork(function* () {
    let task

    while (true) {
      const action = yield take(patternOrChannel)
      const { requestId } = action?.meta

      if (!requestId) {
        throw Error('Non-saga action')
      }

      const request = requests[requestId]
      let deferred

      if (!request) {
        deferred = yield (new Promise(onAdd => {
          requests[requestId] = { onAdd }
        }))
      } else {
        deferred = request.deferred
      }

      const { resolve, reject } = deferred

      if (latest && task && (yield cancelled(task))) {
        yield cancel(task)
        reject(Error('Saga cancelled'))
      }

      function* wrap(fn, ...args) {
        try {
          const result = yield call(fn, ...args)

          resolve(result)
        } catch (error) {
          reject(error)
        }

        delete requests[requestId]
      }

      task = yield fork(wrap, saga, ...args.concat(action))
    }
  })

export const takeLatestAsync = takeAsync(true)

export const takeEveryAsync = takeAsync(false)

export function* putAsync(action) {
  return unwrapResult(yield (yield put(action)))
}
