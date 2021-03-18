'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _lodashLangIsObject = require('lodash/lang/isObject');

var _lodashLangIsObject2 = _interopRequireDefault(_lodashLangIsObject);

var _invariant = require('invariant');

var _invariant2 = _interopRequireDefault(_invariant);

/**
 * an elegance way to write reducer
 * @param funcMap the functions map
 * @param initialState initiate state
 * @returns {Function}
 */

exports['default'] = function (funcMap, initialState) {
  (0, _invariant2['default'])((0, _lodashLangIsObject2['default'])(funcMap), 'funcMap need to be a plain object');
  return function () {
    var state = arguments.length <= 0 || arguments[0] === undefined ? initialState : arguments[0];
    var action = arguments.length <= 1 || arguments[1] === undefined ? null : arguments[1];
    return funcMap.hasOwnProperty(action.type) ? funcMap[action.type](state, action) : state;
  };
};

module.exports = exports['default'];