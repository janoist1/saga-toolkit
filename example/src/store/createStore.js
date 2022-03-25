import { configureStore, getDefaultMiddleware } from '@reduxjs/toolkit'
import { routerMiddleware } from 'connected-react-router'
import createSagaMiddleware from 'redux-saga'
import { all } from 'redux-saga/effects'
import createRootReducer from './reducers'
import mainSagas from '../sagas'

const createStore = ({ history }) => {
  const sagaMiddleware = createSagaMiddleware()
  const store = configureStore({
    reducer: createRootReducer(history),
    middleware: [
      ...getDefaultMiddleware(),
      routerMiddleware(history),
      sagaMiddleware,
    ],
    // middleware: getDefaultMiddleware => getDefaultMiddleware().concat(sagaMiddleware),
    devTools: true,
  })

  sagaMiddleware.run(function* () {
    yield all([
      ...mainSagas,
    ])
  })

  // if (process.env.NODE_ENV !== 'production' && module.hot) {
  //   module.hot.accept('../src/modules', () => store.replaceReducer(rootReducer))
  // }

  return store
}

export default createStore
