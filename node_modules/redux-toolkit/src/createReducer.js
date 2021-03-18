import isObject from 'lodash/lang/isObject';
import invariant from 'invariant';

/**
 * an elegance way to write reducer
 * @param funcMap the functions map
 * @param initialState initiate state
 * @returns {Function}
 */
export default function(funcMap, initialState) {
	invariant(isObject(funcMap), 'funcMap need to be a plain object')
  return (state = initialState, action = null) =>  funcMap.hasOwnProperty(action.type) ?
    funcMap[action.type](state, action) :
    state;
}
