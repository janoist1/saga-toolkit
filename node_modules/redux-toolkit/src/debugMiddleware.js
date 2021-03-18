import debug from 'debug';
import { isFSA } from 'flux-standard-action';
import invariant from 'invariant';

// 打印触发的action
export default function({ getState }) {
  return function(next) {
    return function(action) {
      invariant(isFSA(action), `action don't match FSA:\n${JSON.stringify(action)}`);
      debug('action')(JSON.stringify(action));
      next(action);
      debug('nextState')(getState());	
    };
  };
}
