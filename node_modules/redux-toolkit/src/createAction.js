import isFunction from 'lodash/lang/isFunction';
import isArray from 'lodash/lang/isArray';

export default function(type, payload) {
  let actionCreator = null;
  if (payload === undefined) {
    actionCreator = () => ({
      type
    });
  } else if (typeof  payload === 'string') {
    actionCreator = args => ({
      type,
      payload: {
        [payload]: args[0]
      }
    });
  } else if (isArray(payload)) {
    actionCreator = args => ({
      type,
      payload: payload.reduce((pre, key, index) => {
        pre[key] = args[index];
        return pre;
      }, {})
    });
  } else if (isFunction(payload)) {
    actionCreator = args => ({
      type,
      [payload]: payload(...args)
    });
  }
  return (...args) => {
    const action = actionCreator(args);

    return actionCreator(args);
  };
}
