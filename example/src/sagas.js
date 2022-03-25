import { call, cancelled, delay, put, select, takeEvery } from 'redux-saga/effects'
import {
  takeEveryAsync,
  takeLatestAsync,
  takeAggregateAsync,
  putAsync,
} from 'saga-toolkit'
import * as actions from './slice'

const hyperSuperApi = (success = true) => {
  console.log('hyperSuperApi')

  // let timeoutId
  // const deferred = {}

  const promise = new Promise((resolve, reject) => {
    // deferred.resolve = resolve
    // deferred.reject = reject
    // timeoutId = setTimeout(() => (success ? resolve : reject)('result'), 1000)
    setTimeout(() => (success ? resolve : reject)('result'), 1000)
  })

  // deferred.promise = promise

  // promise.abort = () => {
  //   clearTimeout(timeoutId)
  //   deferred.reject('Aborted')
  // }

  return promise
}

function* appStart() {
  try {
    // fetch things at app start

    // non blocking way
    // yield put(actions.fetchThings())

    // OR wait for it to finish - a blocking way
    // yield putAsync(actions.fetchThings())
  } catch (error) {
    console.log('appStart 1', error)
  }

  // yield delay(1000)

  // try {
  //   yield put(actions.fetchThings())
  // } catch (error) {
  //   console.log('appStart 2', error)
  // }

  console.log('Started')
}

function* fetchThings({ meta }) {
  const result = yield call(() => hyperSuperApi(meta.arg))

  return result
}

function* fetchThingsDebounce({ meta }) {
  try {
    yield delay(1000)

    console.log('STILL RUNNING', meta.requestId)
  } finally {
    if (yield cancelled()) {
      console.log('CANCELLED', meta.requestId)
    }
  }

  return 'shite'
}

function* click() {
  try {
    yield putAsync(actions.fetchThings(false)) // wait 
  } catch (error) {
    console.log('click', { error })
  }
}

export default [
  takeEveryAsync(actions.start.pending, appStart),
  // takeAggregateAsync(actions.fetchThings.pending, fetchThings),
  takeEveryAsync(actions.fetchThings.pending, fetchThings),
  takeLatestAsync(actions.fetchThingsDebounce.pending, fetchThingsDebounce),
  takeEvery(actions.click.type, click),
]
