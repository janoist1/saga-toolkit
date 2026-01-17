import { configureStore } from '@reduxjs/toolkit'
import createSagaMiddleware from 'redux-saga'
import { all } from 'redux-saga/effects'
import rootReducer from './reducers'
import mainSagas from '../sagas'

const createStore = () => {
  const sagaMiddleware = createSagaMiddleware()
  const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(sagaMiddleware),
    devTools: true,
  })

  sagaMiddleware.run(function* () {
    yield all([
      ...mainSagas,
    ])
  })

  return store
}

export default createStore
