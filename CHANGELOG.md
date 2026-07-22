# Changelog

## [2.5.0] - 2026-07-17
### Added
- **Type-safe effect overloads**: `takeEveryAsync` / `takeLatestAsync` / `takeAggregateAsync` now also accept the saga action creator itself — `takeEveryAsync(fetchUser, saga)` — inferring the worker's action type *and* enforcing its return type automatically (no more manual `SagaActionFromCreator` annotations).
- `putAsync` is now generic — `yield* putAsync(action())` returns the typed result.
- New `SagaPendingAction<C>` type helper and `AbortablePromise<T>` type.
- `useSagaActions` promises now expose the thunk's **`abort()`** so cancellation is reachable from components.
- CI workflow: lint + tests + build on Node 20/22, plus a **Redux Toolkit 2.x** compatibility job (the RTK 2 peer range is now actually tested).
- Test coverage for `useSagaActions` (jsdom + Testing Library).

### Fixed
- **Cancellation now truly propagates from the promise to the saga**: calling `promise.abort()` cancels the running worker saga (the README claimed this, but it was not implemented).
- **Unhandled actions no longer hang forever**: if no saga picks up a dispatched saga action within 30s, its promise rejects with an actionable error message pointing at the missing watcher registration.
- **`takeAggregateAsync` deduplicates per argument**: actions with different `meta.arg` no longer receive each other's results (matches the documented "identical actions" behavior). A same-tick race where concurrent dispatches could each start their own run is also fixed.
- **Extra `...args` support was broken**: the action was passed *last* to the worker (redux-saga convention) while the wrapper expected it *first* — any effect used with extra args crashed or hung. Arguments now follow the documented `(action, ...args)` order.
- Workers watching plain (non-saga) actions no longer crash — they run without promise bridging instead.
- `takeAggregateAsync`: non-JSON-serializable args (circular structures, functions…) no longer collide on a lossy `String(arg)` key — objects/functions deduplicate by identity, everything else opts out of deduplication, so distinct args can never receive each other's results.
- `takeLatestAsync`: superseding a request in the same tick no longer leaks its internal registry entry (and watchdog timer) permanently — the worker's cleanup now also covers cancellation while it is still waiting for request registration.
- `useSagaActions`: plain (non-thunk) action creators are returned as-is instead of being wrapped in a promise (their declared types were already claiming this).
- TTL watchdog timers are cleared as soon as a request completes, and `unref`ed in Node.js so they don't keep SSR/test processes alive.

### Changed
- Packaging: added `sideEffects: false` (tree-shaking); ESM consumers now get `index.d.mts` through a properly split `exports` → `types` condition; added the `./package.json` export.
- Inlined the ~10-line deferred helper, removing the *undeclared* runtime dependency on `@redux-saga/deferred` (previously it worked only because tsup happened to bundle it).
- Dev/test stack: React 18 + react-redux 8 + Testing Library locally (the oldest supported peer line), RTK 2.x covered in CI.

## [2.4.0] - 2026-07-17
### Changed
- Extended `peerDependencies` to support **React 19** (`^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0`). Fixes ERESOLVE install errors in React 19 projects (#6).
- Bumped `@types/react` to `^19.0.0` in `devDependencies`.

## [2.2.7] - 2026-01-17
### Fixed
- **Critical Fix**: Resolved a regression where `takeLatestAsync` would hang indefinitely if the previous action's request was already cleaned up (e.g., via TTL).
- Updated internal request lookups in effects to use non-blocking `getRequestSync`.

## [2.2.6] - 2026-01-17
### Fixed
- Updated `peerDependencies` to support **Redux Toolkit 2.0** (`^1.9.5 || ^2.0.0`).

## [2.2.5] - 2026-01-17
### Added
- New effect: `takeAggregateAsync` for request de-duplication (multiple identical actions share the same promise).
- Restored `SagaActionFromCreator` type helper for better TypeScript ergonomics in worker sagas.
- Comprehensive TypeScript examples in README.
- `bindActionCreators` usage recommendation in README and Example App.

### Changed
- Refactored Example App to use **Vite**, **React 18**, and **TypeScript**.
- Improved worker saga typing using `SagaActionFromCreator`.

## [2.2.4] - 2026-01-17
### Fixed
- **Critical Memory Leak**: Refactored `takeLatestAsync` to use a loop-based `fork`/`cancel` pattern, eliminating internal task accumulation.
- **Resource Cleanup**: Added 30-second TTL auto-cleanup for unhandled actions in the internal request register.
- Regression tests for memory leak verification.

## [2.1.x] -> [2.2.3]
### Changed
- Modernized build system to **tsup**.
- Migration to **Vitest** for testing.
- Full TypeScript conversion of the core library.
- Improved error handling and cancellation propagation.
