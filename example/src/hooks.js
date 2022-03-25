import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { bindActionCreators } from 'redux'
import * as actions from './slice'

const selectAppRoot = state => state.root

export const useApp = () => ({
  ...bindActionCreators(actions, useDispatch()),
  ...useSelector(selectAppRoot),
})

export const useAppStart = () => {
  const { start } = useApp()

  useEffect(() => {
    start()
  }, [])
}
