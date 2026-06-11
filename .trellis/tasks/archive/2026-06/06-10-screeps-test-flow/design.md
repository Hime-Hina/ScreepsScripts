# 重构 Screeps 测试流程 Design

## Boundaries

- `pnpm check` remains the default deterministic local gate. It must not require Screeps credentials, official PTR, live Screeps, or a long-lived local Screeps server.
- `test:bundle` owns the cheap compiled artifact smoke. It builds `dist/main.js` and executes the bundle without a real Screeps engine.
- `test:screeps-server` owns the local official standalone server PoC. It is explicit, service-backed, rebuilds current source itself, and stays outside `pnpm check`.
- Official PTR remains an online smoke environment. It is documented separately from local server e2e and must not be hidden behind a local test command.
- Live Screeps deploy/readback commands remain production-affecting operations and are not test commands.

## Proposed Local Shape

- Rename the current compiled bundle check from e2e terminology to bundle smoke:
  - script: `test:bundle`
  - test path can remain under `test/e2e/` for the first slice only if moving it adds noise; docs and script names must not call it full e2e.
- Add a separate local server PoC command:
  - script: `test:screeps-server`
  - entrypoint: `scripts/screeps-server/run-suite.mjs smoke`
  - ignored runtime root: `.screeps/server/`
- Add a project-owned local server test framework under `scripts/screeps-server/`. It may borrow concepts from `screepers/screeps-server-mockup` and `screepers/screeps-server-test`, but must not depend on or copy code from those repositories.
- Keep `package.json` script growth bounded. The long-term shape is a small number of stable suite commands, not one package script per e2e behavior.
- Keep PTR as a documented explicit smoke target. Adding PTR deploy/verify scripts is allowed only as separate commands such as `deploy:ptr:screeps` and `verify:ptr:screeps`, not as flags on live commands.

## Community Reference

Existing community projects use a harness/script shape rather than HTTP-first verification:

- `screeps-server-mockup` exposes a server/world/bot API, starts the private server from a test script, advances ticks explicitly, and reads bot console and memory between ticks.
- `screeps-server-test` uses the same basic idea: run a private server one tick at a time in a fixed known environment, then inspect state between ticks.

For this project, the first implementation should copy the lifecycle idea, not the dependency. The public command is `pnpm test:screeps-server`; internally it is a Node suite runner and harness under `scripts/screeps-server/` rather than a Vitest spec that hides long-running process lifecycle inside the unit test runner.

## Local Server PoC

Use the official `screeps@4.3.0` standalone server package, not `screeps@ptr`, for the first local e2e baseline.

The PoC command should:

1. Run `pnpm build`.
2. Prepare an ignored local server dependency directory under `.screeps/server/package/`.
3. Install or reuse `screeps@4.3.0` through `pnpm` in that ignored directory, so root `pnpm install` does not compile Screeps native dependencies.
4. Create a fresh run directory under `.screeps/server/runs/`.
5. Seed the world from the official launcher `init_dist` data without invoking interactive `screeps init`.
6. Replace one active bot/user `main` module in the seeded LokiJS `db.json` with the local `dist/main.js` source through JSON parsing.
7. Generate a run-scoped test mod that writes minimal status events to a local status file without patching official server source.
8. Start the official launcher with local ports, one runner, one processor, local logs, the test mod, an offline Steam Web API stub in the backend process, and no live credentials.
9. Wait for observable evidence that the compiled bundle ran in a natural server tick.
10. Stop every child process and report install, startup, tick observation, teardown, and total timings.

## Local Test Framework

The first framework surface is project-owned and minimal:

- `ScreepsLocalServerHarness`
- `prepareSingleOwnedSpawnFixture()`
- `start()`
- `waitForReady()`
- `waitForPlayerHeartbeat()`
- `readBotMemory()`
- `stop()`

The harness owns the test lifecycle:

```text
install/reuse server package
prepare fixture
generate run-scoped status mod
start official server processes
wait for server status events and process health
wait for player-code heartbeat
read saved Memory from runner status
stop process tree
report timings
```

The status mod is an internal event bridge, not a public HTTP API. It writes JSON lines to a run-scoped file such as `.screeps/server/runs/<id>/status.jsonl`. The harness waits on that file plus process exits and player logs. HTTP readiness probes are a fallback only if the file bridge is insufficient.

The PoC must use a seeded user that owns a room and `Spawn1`. A tick that runs with an empty `Game.spawns` is not sufficient.

By default, seeding disables other official `simplebot` users and keeps one controlled user active. Future multi-bot scenarios should be added as named fixtures and behavior cases owned by the local server e2e suite, not as a hidden default.

The first fixed fixture is `single-owned-spawn`:

- One active bot user.
- Use the seeded `AliceBot` user in room `W1N9` with `Spawn1` unless the official seed data changes.
- One owned room.
- One owned `Spawn1`.
- Other bot code inactive.
- The active user's `main` module is replaced with current `dist/main.js`.
- Passing evidence is a natural tick heartbeat from the official runner after `saveResultFinish`, with `Memory.screepsScripts.schemaVersion = 1` for the active user in that same runner result.

## Future Local Server Suite Shape

The PoC starts with one public command because it proves the local official server boundary. That command already routes through the smoke suite. When local server e2e coverage grows, do not add a package script for every behavior.

Keep package scripts as suite-level entrypoints, for example:

```json
{
  "test:screeps-server": "node scripts/screeps-server/run-suite.mjs smoke",
  "test:screeps-server:full": "node scripts/screeps-server/run-suite.mjs full"
}
```

The runner should own a registry of suites and cases:

```text
suite: smoke
  case: basic-runtime-heartbeat
  case: memory-schema-write
  case: initial-worker-spawn

suite: full
  case: basic-runtime-heartbeat
  case: initial-worker-spawn
  case: worker-harvest
  case: worker-transfer
  case: controller-upgrade
```

Case selection for local debugging is allowed inside the same local official server boundary, for example:

```powershell
node scripts/screeps-server/run-suite.mjs case worker-harvest
```

This is different from mode flags that switch environment or side effects. Do not use `test:screeps-server` flags to target PTR, live, deploy, rollback, or any command that reads credentials or mutates official services.

Distinguish these concepts:

- Suite: a stable runner entrypoint such as smoke or full.
- Case: one behavior assertion such as initial worker spawn or worker harvest.
- Fixture: a prepared world state such as `single-owned-spawn`, `worker-near-source`, or `worker-near-controller`.

Fixtures can be reused by multiple cases. Cases should own their expected observations and teardown requirements.

## Contracts

- The local server PoC owns all files below `.screeps/server/`; no generated server data is tracked.
- The official server dependency is cached under `.screeps/server/package/`. The command installs `screeps@4.3.0` on first run and reuses the cache when the installed version matches.
- If the cached server package is missing or has the wrong version, the command automatically rebuilds `.screeps/server/package/` after verifying the resolved path is inside the repository's `.screeps/server/` directory.
- The PoC never reads `screeps.json` and never prints live token material.
- The PoC does not mutate official PTR or live Screeps.
- World seeding uses structured JSON parsing for `db.json`, not ad hoc text replacement.
- The default world fixture is `single-owned-spawn`. Extra bots must be enabled only by a named fixture/case combination that owns its expected observations.
- Local server e2e growth should be handled through suite/case registration inside the runner. Package scripts should remain stable suite entrypoints.
- The PoC must not patch official Screeps server package files. Server-side observability comes from a generated run-scoped mod loaded through `mods.json`.
- The first test mod only writes readiness/status events to the run status file. It must not expose a backend HTTP endpoint in the main path and must not change constants, tick duration, object processing, intents, terrain, room objects, or player sandbox behavior.
- The test mod may replace `steam-webapi.ready()` inside the backend process with a local success callback so the server can start without native greenworks or a real Steam Web API call. It must not read live credentials.
- Process cleanup is part of the operation. A failed assertion still attempts teardown before returning non-zero.
- Recursive cache deletion is allowed only for `.screeps/server/package/` after resolving and checking the absolute target path.
- Timing output is part of the contract because the future bundle-smoke replacement decision depends on measured cost.
- The first PoC uses the run status file, server logs, and official runner `saveResultFinish` payload as observation channels. Local HTTP API verification is deferred to a later task because it requires a separate local auth/token boundary.
- Waiting is signal-driven, not sleep-driven. Installation waits for subprocess exit, server readiness waits for status-file events and process health, tick verification waits for player-code heartbeat or runtime error logs, and Memory verification waits for the runner status event that includes the saved Memory payload. Each wait has a watchdog timeout only to prevent hangs.

## Observable Behavior

- Public interface under test: `pnpm test:screeps-server`.
- Input/action: `test:screeps-server` builds current TypeScript source into `dist/main.js`, then loads that artifact into the official local Screeps server.
- Expected outcome: a natural tick executes the compiled `loop` for a user with an owned room and owned `Spawn1`, emits the existing heartbeat, and writes the current project `Memory` root.
- Boundary not mocked: official Screeps engine process, storage process, runner process, and processor process.
- Boundary owned by unit/system tests: package script names, default `pnpm check` composition, ignored generated paths, and documentation wording.
- Server status hook: a generated mod may write local status-file events for readiness diagnostics, but it is not sufficient passing evidence for player-code execution.
- Deferred boundary: local HTTP API readback/Memory verification. It should be added later as a separate behavior slice, not as a hidden part of this first PoC.

## Trade-Offs

- Keeping `test:bundle` during the PoC avoids removing cheap coverage before the service-backed test has real cost data.
- Installing Screeps in an ignored local package avoids making every contributor and CI job compile native Screeps dependencies during ordinary `pnpm install`.
- Caching the ignored local package gives separate cold and warm cost data without moving Screeps native dependencies into root `devDependencies`.
- Bypassing interactive `screeps init` is necessary for automation; the generated world must still come from the official package data to keep the PoC tied to the official server.
- A generated status mod is preferable to patching official package source because it uses the server's documented extension mechanism and keeps the official package cache disposable.
- A project-owned harness is preferable for the first PoC because it lets the repository control lifecycle, fixture, evidence, timing, and teardown contracts while still learning from existing community harnesses.
- Official PTR is more valuable than local `screeps@ptr` for pre-release smoke. Local `screeps@ptr` is deferred until a PTR-specific bug needs local reproduction.

## Documentation Impact

- `docs/architecture.md` should distinguish bundle smoke from local server e2e.
- `docs/development.md` should document `test:bundle`, `test:screeps-server`, default gate behavior, and local server generated paths.
- `.trellis/spec/testing/test-layers.md` should be updated so future agents do not keep calling compiled bundle smoke a full e2e.

## Rollback

- Revert package scripts, tests, docs, and `scripts/screeps-server/`.
- Delete `.screeps/server/` if generated server state should be removed locally.
- No live or PTR rollback is required because this task does not mutate official services.
