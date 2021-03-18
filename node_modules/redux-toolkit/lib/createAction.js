'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var _lodashLangIsFunction = require('lodash/lang/isFunction');

var _lodashLangIsFunction2 = _interopRequireDefault(_lodashLangIsFunction);

var _lodashLangIsArray = require('lodash/lang/isArray');

var _lodashLangIsArray2 = _interopRequireDefault(_lodashLangIsArray);

exports['default'] = function (type, payload) {
  var actionCreator = null;
  if (payload === undefined) {
    actionCreator = function () {
      return {
        type: type
      };
    };
  } else if (typeof payload === 'string') {
    actionCreator = function (args) {
      return {
        type: type,
        payload: _defineProperty({}, payload, args[0])
      };
    };
  } else if ((0, _lodashLangIsArray2['default'])(payload)) {
    actionCreator = function (args) {
      return {
        type: type,
        payload: payload.reduce(function (pre, key, index) {
          pre[key] = args[index];
          return pre;
        }, {})
      };
    };
  } else if ((0, _lodashLangIsFunction2['default'])(payload)) {
    actionCreator = function (args) {
      return _defineProperty({
        type: type
      }, payload, payload.apply(undefined, _toConsumableArray(args)));
    };
  }
  return function () {
    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    var action = actionCreator(args);

    return actionCreator(args);
  };
};

module.exports = exports['default'];