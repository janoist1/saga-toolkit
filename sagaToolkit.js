import { createAsyncThunk, unwrapResult } from '@reduxjs/toolkit'
import { call, cancel, cancelled, fork, take, put } from '@redux-saga/core/effects'
import createDeferred from '@redux-saga/deferred'

const requests = {}

const addRequest = requestId => {
  const deferred = createDeferred()

  if (requests[requestId]) {
    requests[requestId].deferred = deferred
    requests[requestId].onAdd(deferred)
  } else {
    requests[requestId] = { deferred }
  }

  return deferred.promise
}

export const createSagaAction = type => {
  const action = createAsyncThunk(type, async (_, { requestId }) => addRequest(requestId))

  action.type = action.pending

  return action
}

const takeAsync = ({ latest = false, aggregate = false }) => (patternOrChannel, saga, ...args) =>
  fork(function* () {
    const queue = []

    function* processQueue() {
      let task

      while (queue.length) {
        const action = queue.shift()
        const { requestId } = action.meta
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

        if (latest && task && !(yield cancelled(task))) {
          yield cancel(task)
        }

        function* wrap(saga, ...args) {
          try {
            resolve(yield call(saga, ...args))
          } catch (error) {
            reject(error)
          } finally {
            if (yield cancelled()) {
              reject('Saga cancelled')
            }
          }
        }

        if (aggregate && task) {
          requests[task.requestId].deferred.promise.then(resolve).catch(reject)
        } else {
          task = yield fork(wrap, saga, ...args.concat(action))
          task.requestId = requestId
        }

        requests[task.requestId].deferred.promise.finally(() => {
          delete requests[requestId]
        }).catch(() => undefined)
      }
    }

    let processor

    while (true) {
      const action = yield take(patternOrChannel)

      const { requestId } = action?.meta

      if (!requestId) {
        throw Error('Non-saga action')
      }

      queue.push(action)

      if (!processor?.isRunning()) {
        processor = yield fork(processQueue)
      }
    }
  })

export const takeEveryAsync = takeAsync({})

export const takeLatestAsync = takeAsync({ latest: true })

export const takeAggregateAsync = takeAsync({ aggregate: true })

export function* putAsync(action) {
  return unwrapResult(yield (yield put(action)))
}
