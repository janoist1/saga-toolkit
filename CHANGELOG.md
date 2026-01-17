# Changelog

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
