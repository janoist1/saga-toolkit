"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.putAsync = putAsync;
exports.takeAggregateAsync = exports.takeLatestAsync = exports.takeEveryAsync = exports.createSagaAction = void 0;

var _toolkit = require("@reduxjs/toolkit");

var _effects = require("redux-saga/effects");

var _marked3 = /*#__PURE__*/regeneratorRuntime.mark(putAsync);

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

var takeAsync = function takeAsync(_ref2) {
  var _ref2$latest = _ref2.latest,
      latest = _ref2$latest === void 0 ? false : _ref2$latest,
      _ref2$aggregate = _ref2.aggregate,
      aggregate = _ref2$aggregate === void 0 ? false : _ref2$aggregate;
  return function (patternOrChannel, saga) {
    for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
      args[_key - 2] = arguments[_key];
    }

    return (0, _effects.fork)( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
      var _marked2, queue, processQueue, processor, _processor, action, _action$meta, requestId;

      return regeneratorRuntime.wrap(function _callee$(_context4) {
        while (1) {
          switch (_context4.prev = _context4.next) {
            case 0:
              processQueue = function _processQueue() {
                var task, _loop;

                return regeneratorRuntime.wrap(function processQueue$(_context3) {
                  while (1) {
                    switch (_context3.prev = _context3.next) {
                      case 0:
                        _loop = /*#__PURE__*/regeneratorRuntime.mark(function _loop() {
                          var _marked, action, requestId, request, deferred, _deferred, resolve, reject, wrap;

                          return regeneratorRuntime.wrap(function _loop$(_context2) {
                            while (1) {
                              switch (_context2.prev = _context2.next) {
                                case 0:
                                  wrap = function _wrap(saga) {
                                    var _len2,
                                        args,
                                        _key2,
                                        _args = arguments;

                                    return regeneratorRuntime.wrap(function wrap$(_context) {
                                      while (1) {
                                        switch (_context.prev = _context.next) {
                                          case 0:
                                            _context.prev = 0;

                                            for (_len2 = _args.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
                                              args[_key2 - 1] = _args[_key2];
                                            }

                                            _context.t0 = resolve;
                                            _context.next = 5;
                                            return _effects.call.apply(void 0, [saga].concat(args));

                                          case 5:
                                            _context.t1 = _context.sent;
                                            (0, _context.t0)(_context.t1);
                                            _context.next = 12;
                                            break;

                                          case 9:
                                            _context.prev = 9;
                                            _context.t2 = _context["catch"](0);
                                            reject(_context.t2);

                                          case 12:
                                            _context.prev = 12;
                                            _context.next = 15;
                                            return (0, _effects.cancelled)();

                                          case 15:
                                            if (!_context.sent) {
                                              _context.next = 17;
                                              break;
                                            }

                                            reject('Saga cancelled');

                                          case 17:
                                            return _context.finish(12);

                                          case 18:
                                          case "end":
                                            return _context.stop();
                                        }
                                      }
                                    }, _marked, null, [[0, 9, 12, 18]]);
                                  };

                                  _marked = /*#__PURE__*/regeneratorRuntime.mark(wrap);
                                  action = queue.shift();
                                  requestId = action.meta.requestId;
                                  request = requests[requestId];
                                  deferred = void 0;

                                  if (request) {
                                    _context2.next = 12;
                                    break;
                                  }

                                  _context2.next = 9;
                                  return new Promise(function (onAdd) {
                                    requests[requestId] = {
                                      onAdd: onAdd
                                    };
                                  });

                                case 9:
                                  deferred = _context2.sent;
                                  _context2.next = 13;
                                  break;

                                case 12:
                                  deferred = request.deferred;

                                case 13:
                                  _deferred = deferred, resolve = _deferred.resolve, reject = _deferred.reject;
                                  _context2.t0 = latest && task;

                                  if (!_context2.t0) {
                                    _context2.next = 19;
                                    break;
                                  }

                                  _context2.next = 18;
                                  return (0, _effects.cancelled)(task);

                                case 18:
                                  _context2.t0 = !_context2.sent;

                                case 19:
                                  if (!_context2.t0) {
                                    _context2.next = 22;
                                    break;
                                  }

                                  _context2.next = 22;
                                  return (0, _effects.cancel)(task);

                                case 22:
                                  if (!(aggregate && task)) {
                                    _context2.next = 26;
                                    break;
                                  }

                                  requests[task.requestId].deferred.promise.then(resolve)["catch"](reject);
                                  _context2.next = 30;
                                  break;

                                case 26:
                                  _context2.next = 28;
                                  return _effects.fork.apply(void 0, [wrap, saga].concat(_toConsumableArray(args.concat(action))));

                                case 28:
                                  task = _context2.sent;
                                  task.requestId = requestId;

                                case 30:
                                  requests[task.requestId].deferred.promise["finally"](function () {
                                    delete requests[requestId];
                                  });

                                case 31:
                                case "end":
                                  return _context2.stop();
                              }
                            }
                          }, _loop);
                        });

                      case 1:
                        if (!queue.length) {
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
                }, _marked2);
              };

              _marked2 = /*#__PURE__*/regeneratorRuntime.mark(processQueue);
              queue = [];

            case 3:
              if (!true) {
                _context4.next = 17;
                break;
              }

              _context4.next = 6;
              return (0, _effects.take)(patternOrChannel);

            case 6:
              action = _context4.sent;
              _action$meta = action === null || action === void 0 ? void 0 : action.meta, requestId = _action$meta.requestId;

              if (requestId) {
                _context4.next = 10;
                break;
              }

              throw Error('Non-saga action');

            case 10:
              queue.push(action);

              if ((_processor = processor) !== null && _processor !== void 0 && _processor.isRunning()) {
                _context4.next = 15;
                break;
              }

              _context4.next = 14;
              return (0, _effects.fork)(processQueue);

            case 14:
              processor = _context4.sent;

            case 15:
              _context4.next = 3;
              break;

            case 17:
            case "end":
              return _context4.stop();
          }
        }
      }, _callee);
    }));
  };
};

var takeEveryAsync = takeAsync({});
exports.takeEveryAsync = takeEveryAsync;
var takeLatestAsync = takeAsync({
  latest: true
});
exports.takeLatestAsync = takeLatestAsync;
var takeAggregateAsync = takeAsync({
  aggregate: true
});
exports.takeAggregateAsync = takeAggregateAsync;

function putAsync(action) {
  return regeneratorRuntime.wrap(function putAsync$(_context5) {
    while (1) {
      switch (_context5.prev = _context5.next) {
        case 0:
          _context5.t0 = _toolkit.unwrapResult;
          _context5.next = 3;
          return (0, _effects.put)(action);

        case 3:
          _context5.next = 5;
          return _context5.sent;

        case 5:
          _context5.t1 = _context5.sent;
          return _context5.abrupt("return", (0, _context5.t0)(_context5.t1));

        case 7:
        case "end":
          return _context5.stop();
      }
    }
  }, _marked3);
}