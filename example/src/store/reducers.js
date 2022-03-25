import { combineReducers } from 'redux'
import { connectRouter } from 'connected-react-router'
import root from '../slice'

const createRootReducer = history =>
  combineReducers({
    router: connectRouter(history),
    root,
  })

export default createRootReducer
