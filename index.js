"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.putAsync = putAsync;
exports.takeEveryAsync = exports.takeLatestAsync = exports.createSagaAction = void 0;

var _toolkit = require("@reduxjs/toolkit");

var _effects = require("redux-saga/effects");

var _marked2 = /*#__PURE__*/regeneratorRuntime.mark(putAsync);

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

var createDeferredForSaga = function createDeferredForSaga() {
  var deferred = {};
  deferred.promise = new Promise(function (resolve, reject) {
    deferred.resolve = resolve;

    deferred.reject = function (error) {
      (error === null || error === void 0 ? void 0 : error.message) === 'Saga cancelled' ? resolve() : reject(error);
    };
  });
  return deferred;
};

var requests = {};

var addRequest = function addRequest(requestId) {
  var deferred = createDeferredForSaga();

  if (requests[requestId]) {
    requests[requestId].deferred = deferred;
    requests[requestId].onAdd(deferred);
  } else {
    requests[requestId] = {
      deferred: deferred
    };
  }

  return deferred.promise;
};

var createSagaAction = function createSagaAction(type) {
  var action = (0, _toolkit.createAsyncThunk)(type, function (_, _ref) {
    var requestId = _ref.requestId;
    return addRequest(requestId);
  });
  action.type = action.pending;
  return action;
};

exports.createSagaAction = createSagaAction;

var takeAsync = function takeAsync() {
  var latest = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
  return function (patternOrChannel, saga) {
    for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
      args[_key - 2] = arguments[_key];
    }

    return (0, _effects.fork)( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
      var task, _loop;

      return regeneratorRuntime.wrap(function _callee$(_context3) {
        while (1) {
          switch (_context3.prev = _context3.next) {
            case 0:
              _loop = /*#__PURE__*/regeneratorRuntime.mark(function _loop() {
                var _marked, action, _action$meta, requestId, request, deferred, _deferred, resolve, reject, wrap;

                return regeneratorRuntime.wrap(function _loop$(_context2) {
                  while (1) {
                    switch (_context2.prev = _context2.next) {
                      case 0:
                        wrap = function _wrap(fn) {
                          var _len2,
                              args,
                              _key2,
                              result,
                              _args = arguments;

                          return regeneratorRuntime.wrap(function wrap$(_context) {
                            while (1) {
                              switch (_context.prev = _context.next) {
                                case 0:
                                  _context.prev = 0;

                                  for (_len2 = _args.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
                                    args[_key2 - 1] = _args[_key2];
                                  }

                                  _context.next = 4;
                                  return _effects.call.apply(void 0, [fn].concat(args));

                                case 4:
                                  result = _context.sent;
                                  resolve(result);
                                  _context.next = 11;
                                  break;

                                case 8:
                                  _context.prev = 8;
                                  _context.t0 = _context["catch"](0);
                                  reject(_context.t0);

                                case 11:
                                  delete requests[requestId];

                                case 12:
                                case "end":
                                  return _context.stop();
                              }
                            }
                          }, _marked, null, [[0, 8]]);
                        };

                        _marked = /*#__PURE__*/regeneratorRuntime.mark(wrap);
                        _context2.next = 4;
                        return (0, _effects.take)(patternOrChannel);

                      case 4:
                        action = _context2.sent;
                        _action$meta = action === null || action === void 0 ? void 0 : action.meta, requestId = _action$meta.requestId;

                        if (requestId) {
                          _context2.next = 8;
                          break;
                        }

                        throw Error('Non-saga action');

                      case 8:
                        request = requests[requestId];
                        deferred = void 0;

                        if (request) {
                          _context2.next = 16;
                          break;
                        }

                        _context2.next = 13;
                        return new Promise(function (onAdd) {
                          requests[requestId] = {
                            onAdd: onAdd
                          };
                        });

                      case 13:
                        deferred = _context2.sent;
                        _context2.next = 17;
                        break;

                      case 16:
                        deferred = request.deferred;

                      case 17:
                        _deferred = deferred, resolve = _deferred.resolve, reject = _deferred.reject;
                        _context2.t0 = latest && task;

                        if (!_context2.t0) {
                          _context2.next = 23;
                          break;
                        }

                        _context2.next = 22;
                        return (0, _effects.cancelled)(task);

                      case 22:
                        _context2.t0 = _context2.sent;

                      case 23:
                        if (!_context2.t0) {
                          _context2.next = 27;
                          break;
                        }

                        _context2.next = 26;
                        return (0, _effects.cancel)(task);

                      case 26:
                        reject(Error('Saga cancelled'));

                      case 27:
                        _context2.next = 29;
                        return _effects.fork.apply(void 0, [wrap, saga].concat(_toConsumableArray(args.concat(action))));

                      case 29:
                        task = _context2.sent;

                      case 30:
                      case "end":
                        return _context2.stop();
                    }
                  }
                }, _loop);
              });

            case 1:
              if (!true) {
                _context3.next = 5;
                break;
              }

              return _context3.delegateYield(_loop(), "t0", 3);

            case 3:
              _context3.next = 1;
              break;

            case 5:
            case "end":
              return _context3.stop();
          }
        }
      }, _callee);
    }));
  };
};

var takeLatestAsync = takeAsync(true);
exports.takeLatestAsync = takeLatestAsync;
var takeEveryAsync = takeAsync(false);
exports.takeEveryAsync = takeEveryAsync;

function putAsync(action) {
  return regeneratorRuntime.wrap(function putAsync$(_context4) {
    while (1) {
      switch (_context4.prev = _context4.next) {
        case 0:
          _context4.t0 = _toolkit.unwrapResult;
          _context4.next = 3;
          return (0, _effects.put)(action);

        case 3:
          _context4.next = 5;
          return _context4.sent;

        case 5:
          _context4.t1 = _context4.sent;
          return _context4.abrupt("return", (0, _context4.t0)(_context4.t1));

        case 7:
        case "end":
          return _context4.stop();
      }
    }
  }, _marked2);
}