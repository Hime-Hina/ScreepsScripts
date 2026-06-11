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

## Bundle Smoke

Location: `test/e2e/`

Use bundle smoke tests for compiled artifact behavior through `dist/main.js`. These tests prove the bundle can be loaded and executed in a controlled VM boundary. They do not prove behavior inside the real Screeps engine.

Current reference:

- `test/e2e/compiled-loop.test.ts`

Bundle smoke tests must build the bundle before execution. `pnpm test:bundle` owns this layer and remains in default `pnpm check`.

## Local Official Server E2E

Entry point: `pnpm test:screeps-server`

Use local official server e2e when the behavior must be observed inside the real standalone Screeps engine. This command is explicit and not part of default `pnpm check`.

Current reference:

- `scripts/screeps-server/run-suite.mjs`
- `scripts/screeps-server/cases/case-registry.mjs`
- `scripts/screeps-server/cases/suite-runner.mjs`
- `scripts/screeps-server/fixtures/single-owned-spawn-fixture.mjs`
- `scripts/screeps-server/framework/harness.mjs`
- `scripts/screeps-server/observability/status-mod.mjs`

The default fixture is `single-owned-spawn`: seeded `AliceBot` owns room `W1N9` and `Spawn1`, the active user's `main` module is replaced with current `dist/main.js`, and passing evidence is a natural tick heartbeat plus `Memory.screepsScripts.schemaVersion = 1`.

Generated server state belongs under ignored `.screeps/server/`. The harness installs or reuses official `screeps@4.3.0` there so root install and default checks do not compile Screeps native dependencies.

The current smoke suite runs through a runner-owned suite/case/fixture registry. It contains `basic-runtime-heartbeat` and `memory-schema-write`, both using the `single-owned-spawn` fixture. Future growth should add runner cases and stable suite entrypoints, not a package script per strategy behavior.

### 1. Scope / Trigger

Use this layer when a behavior needs a real Screeps engine, storage process, runner, processor, and natural tick. Do not use it for pure policy decisions, script taxonomy, deploy readback, or live production verification.

### 2. Signatures

- Command: `pnpm test:screeps-server`
- Entrypoint: `scripts/screeps-server/run-suite.mjs smoke`
- Root entrypoint: `scripts/screeps-server/run-suite.mjs`
- Case/suite registry: `scripts/screeps-server/cases/`
- Fixture seeding: `scripts/screeps-server/fixtures/`
- Server lifecycle framework: `scripts/screeps-server/framework/`
- Run-scoped status mod generation: `scripts/screeps-server/observability/`
- Smoke cases: `basic-runtime-heartbeat`, `memory-schema-write`
- Harness class: `ScreepsLocalServerHarness`
- Generated root: `.screeps/server/`
- Server package cache: `.screeps/server/package/`
- Run directory: `.screeps/server/runs/<fixture>-<timestamp>-<pid>/`
- Status stream: `.screeps/server/runs/<id>/status.jsonl`
- Future suite command shape: stable suite entrypoints such as `test:screeps-server` and `test:screeps-server:full`, backed by runner cases rather than one script per case.

### 3. Contracts

- The command must run `pnpm build` before preparing the fixture.
- The server package cache must contain official `screeps@4.3.0`; a missing or mismatched cache is rebuilt only after validating the target path is `.screeps/server/package/`.
- The generated mod may write status events and stub backend `steam-webapi.ready()` locally. It must not change game constants, tick duration, terrain, room objects, intents, processor behavior, or player sandbox semantics.
- The harness must launch storage/backend/engine processes with `STORAGE_HOST=127.0.0.1` and an offline test `STEAM_KEY`; it must not read live credentials.
- Readiness is proved by `storage-ready`, `backend-ready`, and `engine-init` events for main, runner, and processor.
- Player execution is proved by a runner `saveResultFinish` heartbeat for `AliceBot` with `Memory.screepsScripts.schemaVersion = 1`.
- The launcher creates long-lived runner restart timers; the harness must clear captured launcher timers during teardown so the command exits.
- Local server e2e cases belong to the same environment boundary: local official server, generated fixture state, no credentials, no official service mutation.
- Case selection for local debugging may choose a runner case inside this boundary. It must not switch the command into PTR, live, deploy, rollback, or any credentialed operation.
- Distinguish suite, case, and fixture:
  - Suite: stable runner entrypoint such as smoke or full.
  - Case: one behavior assertion such as initial worker spawn.
  - Fixture: prepared world state such as `single-owned-spawn`.

### 4. Validation & Error Matrix

| Condition | Required Behavior |
| --- | --- |
| Native dependency missing after install | Fail with a cache/install error |
| Cache version is not `screeps@4.3.0` | Rebuild the cache after safe path validation |
| Official backend asks for greenworks or real Steam API | Use the offline test key and local `steam-webapi.ready()` stub |
| Readiness event missing | Fail on watchdog with the missing signal name |
| Player runtime error appears | Fail immediately and include the runtime error |
| Heartbeat lacks current Memory schema | Keep waiting until watchdog, then fail |
| Teardown runs after assertion failure | Kill child processes and clear launcher timers before returning non-zero |
| New strategy behavior needs local server e2e coverage | Add a runner case; add a package script only when it is a stable suite entrypoint |
| A flag switches to PTR/live/deploy/rollback | Reject the design; create an explicit command for that boundary |

### 5. Good/Base/Bad Cases

- Good: warm cache starts the official local server, observes `AliceBot` tick and Memory, prints timings, and exits without orphaned child processes.
- Base: cold cache compiles native dependencies slowly but succeeds; record the cost separately from warm cache.
- Bad: the command polls a backend HTTP endpoint as the primary readiness proof, reads live credentials, mutates official package source, or stays alive because a launcher timer was not cleared.
- Bad: every new strategy behavior adds `test:screeps-server:<behavior>` to `package.json`.

### 6. Tests Required

- System tests must assert `test:screeps-server` exists and is not part of `pnpm check`.
- The PoC command must assert the fixture name, active user, room, spawn, heartbeat, Memory schema, timing output, and teardown.
- Bundle smoke must remain available until local server e2e cost is stable enough to revisit default gate composition.
- Future suite runners must test their registry mapping with system or runner-level assertions so package scripts remain bounded.

### 7. Wrong vs Correct

#### Wrong

```text
pnpm test:bundle
# Treat this as real Screeps runtime verification.
```

#### Correct

```text
pnpm test:bundle
pnpm test:screeps-server
# Treat bundle smoke and real local server e2e as separate evidence.
```

#### Wrong

```text
pnpm test:screeps-server --ptr
pnpm test:screeps-server:worker-harvest
pnpm test:screeps-server:worker-transfer
```

#### Correct

```text
pnpm test:screeps-server
pnpm test:screeps-server:full
node scripts/screeps-server/run-suite.mjs case worker-harvest
```

## Official PTR Smoke

Official PTR smoke is online validation against Screeps PTR. It is not part of default `pnpm check` and should use explicit PTR command names or a documented manual flow.

Do not add local `screeps@ptr` to the standard matrix unless a PTR-specific bug needs local reproduction.

## Live Screeps Smoke

Live Screeps smoke is not part of default `pnpm check`.

Live Screeps smoke is required for deployment-affecting behavior once these prerequisites exist:

- A confirmed production branch.
- A rollback path.
- A documented token source that does not expose secrets.
- A known room, shard, spawn name, and expected observable effect.

Passing conditions are defined by `.trellis/spec/operations/live-verification.md`.

Do not treat bundle smoke or local server e2e as live production verification. Record missing live facts in `docs/game-state.md`.
