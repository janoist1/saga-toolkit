'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.takeEveryAsync = exports.takeLatestAsync = exports.createSagaAction = undefined;

var _toolkit = require('@reduxjs/toolkit');

var _effects = require('redux-saga/effects');

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var createDeferredForSaga = function createDeferredForSaga() {
  var deferred = {};

  deferred.promise = new Promise(function (resolve, reject) {
    deferred.resolve = resolve;
    deferred.reject = function (error) {
      error && error.message === 'Saga cancelled' ? resolve() : reject(error);
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
    requests[requestId] = { deferred: deferred };
  }

  return deferred.promise;
};

var createSagaAction = exports.createSagaAction = function createSagaAction(type) {
  var action = (0, _toolkit.createAsyncThunk)(type, function (_, _ref) {
    var requestId = _ref.requestId;

    return addRequest(requestId);
  });

  action.type = action.pending;

  return action;
};

var takeAsync = function takeAsync() {
  var latest = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];
  return function (patternOrChannel, saga) {
    for (var _len = arguments.length, args = Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
      args[_key - 2] = arguments[_key];
    }

    return (0, _effects.fork)(regeneratorRuntime.mark(function _callee() {
      var _this = this;

      var task, _loop;

      return regeneratorRuntime.wrap(function _callee$(_context3) {
        while (1) {
          switch (_context3.prev = _context3.next) {
            case 0:
              task = void 0;
              _loop = regeneratorRuntime.mark(function _loop() {
                var _marked, action, _ref2, requestId, request, deferred, _deferred, resolve, reject, wrap;

                return regeneratorRuntime.wrap(function _loop$(_context2) {
                  while (1) {
                    switch (_context2.prev = _context2.next) {
                      case 0:
                        wrap = function wrap(fn) {
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

                                  for (_len2 = _args.length, args = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
                                    args[_key2 - 1] = _args[_key2];
                                  }

                                  _context.next = 4;
                                  return _effects.call.apply(undefined, [fn].concat(args));

                                case 4:
                                  result = _context.sent;


                                  resolve(result);
                                  _context.next = 11;
                                  break;

                                case 8:
                                  _context.prev = 8;
                                  _context.t0 = _context['catch'](0);

                                  reject(_context.t0);

                                case 11:

                                  delete requests[requestId];

                                case 12:
                                case 'end':
                                  return _context.stop();
                              }
                            }
                          }, _marked[0], this, [[0, 8]]);
                        };

                        _marked = [wrap].map(regeneratorRuntime.mark);
                        _context2.next = 4;
                        return (0, _effects.take)(patternOrChannel);

                      case 4:
                        action = _context2.sent;
                        _ref2 = action && action.meta || {};
                        requestId = _ref2.requestId;

                        if (requestId) {
                          _context2.next = 9;
                          break;
                        }

                        throw Error('Non-saga action');

                      case 9:
                        request = requests[requestId];
                        deferred = void 0;

                        if (request) {
                          _context2.next = 17;
                          break;
                        }

                        _context2.next = 14;
                        return new Promise(function (onAdd) {
                          requests[requestId] = { onAdd: onAdd };
                        });

                      case 14:
                        deferred = _context2.sent;
                        _context2.next = 18;
                        break;

                      case 17:
                        deferred = request.deferred;

                      case 18:
                        _deferred = deferred;
                        resolve = _deferred.resolve;
                        reject = _deferred.reject;
                        _context2.t0 = latest && task;

                        if (!_context2.t0) {
                          _context2.next = 26;
                          break;
                        }

                        _context2.next = 25;
                        return (0, _effects.cancelled)(task);

                      case 25:
                        _context2.t0 = _context2.sent;

                      case 26:
                        if (!_context2.t0) {
                          _context2.next = 30;
                          break;
                        }

                        _context2.next = 29;
                        return (0, _effects.cancel)(task);

                      case 29:
                        reject(Error('Saga cancelled'));

                      case 30:
                        _context2.next = 32;
                        return _effects.fork.apply(undefined, [wrap, saga].concat(_toConsumableArray(args.concat(action))));

                      case 32:
                        task = _context2.sent;

                      case 33:
                      case 'end':
                        return _context2.stop();
                    }
                  }
                }, _loop, _this);
              });

            case 2:
              if (!true) {
                _context3.next = 6;
                break;
              }

              return _context3.delegateYield(_loop(), 't0', 4);

            case 4:
              _context3.next = 2;
              break;

            case 6:
            case 'end':
              return _context3.stop();
          }
        }
      }, _callee, this);
    }));
  };
};

var takeLatestAsync = exports.takeLatestAsync = takeAsync(true);

var takeEveryAsync = exports.takeEveryAsync = takeAsync(false);
