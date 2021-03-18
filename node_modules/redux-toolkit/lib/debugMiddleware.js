'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _fluxStandardAction = require('flux-standard-action');

var _invariant = require('invariant');

var _invariant2 = _interopRequireDefault(_invariant);

// 打印触发的action

exports['default'] = function (_ref) {
  var getState = _ref.getState;

  return function (next) {
    return function (action) {
      (0, _invariant2['default'])((0, _fluxStandardAction.isFSA)(action), 'action don\'t match FSA:\n' + JSON.stringify(action));
      (0, _debug2['default'])('action')(JSON.stringify(action));
      next(action);
      (0, _debug2['default'])('nextState')(getState());
    };
  };
};

module.exports = exports['default'];