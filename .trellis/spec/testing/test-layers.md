# Test Layers

## Unit Tests

Location: `test/unit/`

Use unit tests for pure decision logic and explicit TypeScript interfaces.

Current reference:

- `test/unit/kernel/run-tick.test.ts`

## Integration Tests

Location: `test/integration/`

Use integration tests for source-level module collaboration. Screeps globals may be stubbed at the runtime boundary.

Current reference:

- `test/integration/main-loop.test.ts`

## System Tests

Location: `test/system/`

Use system tests for repository contracts such as package manager, scripts, config files, and deployable artifact expectations.

Current reference:

- `test/system/project-scripts.test.ts`

## Local E2E Tests

Location: `test/e2e/`

Use local e2e tests for compiled bundle behavior through `dist/main.js`.

Current reference:

- `test/e2e/compiled-loop.test.ts`

Local e2e tests must build the bundle before execution. `pnpm test:e2e` already does this.

## Live Screeps E2E

Live Screeps e2e is not part of default `pnpm check`.

Live Screeps e2e is required for deployment-affecting behavior once these prerequisites exist:

- A confirmed production branch.
- A rollback path.
- A documented token source that does not expose secrets.
- A known room, shard, spawn name, and expected observable effect.

Passing conditions are defined by `.trellis/spec/operations/live-verification.md`.

Until those facts exist, do not pretend local bundle tests are live production verification. Record the missing facts in `docs/game-state.md`.
