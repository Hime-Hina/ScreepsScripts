# 重构 Screeps 测试流程 Implementation

## Checklist

- [x] Update system tests for script naming: `test:bundle` stays in `pnpm check`, `test:screeps-server` exists and stays outside `pnpm check`.
- [x] Update `package.json` scripts to use `test:bundle` for compiled bundle smoke and add `test:screeps-server` for the local official server PoC.
- [x] Update docs/specs so bundle smoke, local server e2e, official PTR smoke, and live smoke have distinct purposes.
- [x] Add a project-owned local server test framework under `scripts/screeps-server/`, with `run-suite.mjs smoke` as the command entrypoint.
- [x] Generate a run-scoped status mod and `mods.json` entry that writes local readiness/status events without changing game semantics.
- [x] Keep generated server dependency and run state under ignored `.screeps/server/`.
- [x] Run focused script/system tests, then run `pnpm check`.
- [x] Run `pnpm test:screeps-server` and record the observed cold/warm cost in task notes or docs.
- [x] Revisit whether any docs still imply bundle smoke equals real runtime verification.

## Behavior Slices

1. Script taxonomy slice
   - Public interface: `package.json` scripts and `test/system/project-scripts.test.ts`.
   - Expected behavior: default gate uses `test:bundle`; local server e2e and PTR/live operations remain explicit and outside `pnpm check`.
   - Boundaries: no network, no Screeps server, no credentials.

2. Documentation slice
   - Public interface: `docs/development.md`, `docs/architecture.md`, `.trellis/spec/testing/test-layers.md`.
   - Expected behavior: bundle smoke is not described as complete e2e; local server e2e and official PTR smoke are separately defined.
   - Boundaries: no executable server work.

3. Local server smoke suite slice
   - Public interface: `pnpm test:screeps-server`.
   - Expected behavior: the project-owned runner executes the smoke suite through the suite/case registry. The harness starts official local server processes from isolated generated state with the `single-owned-spawn` fixture, uses seeded `AliceBot` in `W1N9` with `Spawn1`, observes status-file events, confirms natural tick execution of `dist/main.js`, reads `Memory` from the official runner `saveResultFinish` status event, prints timing, and stops the process tree.
   - Boundaries: official Screeps processes are real; live credentials and official online APIs are not used.

## Validation Commands

```powershell
pnpm test:system
pnpm test:bundle
pnpm check
pnpm test:screeps-server
```

## Validation Results

- 2026-06-11 `pnpm test:system` passed: 2 files, 4 tests.
- 2026-06-11 `pnpm test:screeps-server` passed the `smoke` suite with warm cache total `4.18s`.
- 2026-06-11 `pnpm check` passed, including unit/integration coverage, system tests, and bundle smoke.
- 2026-06-11 directory-boundary contract added to `test/system/screeps-server-suite.test.ts`; it failed against the flat `scripts/screeps-server/` layout, then passed after splitting runner, framework, fixture, cases, and observability modules.
- 2026-06-11 post-structure `pnpm test:system` passed: 2 files, 5 tests.
- 2026-06-11 post-structure independent check passed: `pnpm lint`, `pnpm format`, `pnpm typecheck`, `pnpm test:screeps-server`, and `pnpm check`.

## Risk Points

- `screeps@4.3.0` installation compiles native dependencies through `node-gyp`; keep it out of root dependency installation and cache it under `.screeps/server/package/`.
- The command must detect whether the cached server dependency is already `screeps@4.3.0`; reuse matching cache and automatically rebuild mismatched cache after validating the delete target.
- `test:screeps-server` must run `pnpm build` itself, not only check for an existing `dist/main.js`.
- Windows process cleanup must terminate launcher children, not only the parent process.
- Before recursive deletion of `.screeps/server/package/`, resolve the path and verify it is inside `.screeps/server/`.
- Official launcher `init` is interactive; automation must seed from package data directly.
- Do not patch official server package source. Use a generated status mod and a project-owned harness for readiness/status hooks.
- The status mod must not change gameplay semantics such as constants, tick duration, object processing, intents, terrain, room objects, or player sandbox behavior.
- Do not copy code from `screeps-server-mockup` or `screeps-server-test`; use them only as design references.
- Follow the community harness shape at the lifecycle level: command script owns server setup, tick observation, bot console/memory inspection, and teardown.
- Default seeding disables unrelated official simplebots. Multi-bot coverage belongs in a later named fixture and e2e case, not in the default fixture.
- First fixture name is `single-owned-spawn`; the current smoke suite contains only `basic-runtime-heartbeat` and `memory-schema-write`.
- Future local server e2e growth should use the runner-owned suite/case registry. Add package scripts only for stable suite entrypoints such as smoke/full, not for every individual strategy behavior.
- Case selection arguments are acceptable only for local official server e2e debugging inside the same environment boundary. Do not use flags or modes to switch the command into PTR, live, deploy, rollback, credentialed, or production-mutating behavior.
- Server logs may contain noisy startup output. Assertions should use specific heartbeat/Memory evidence.
- Local HTTP API verification is deferred. Do not introduce local auth/token setup or backend endpoint polling in this PoC.
- Do not use fixed sleeps as success criteria. Wait for explicit success/failure signals with watchdog timeouts. Backend readiness should use run-scoped status-file events and process health; player execution still requires heartbeat and Memory evidence.
- Official backend requires either greenworks or a Steam Web API key. The harness supplies an offline test key and the generated backend mod stubs `steam-webapi.ready()` locally. Do not read live credentials for this test.

## Observed PoC Cost

- Cold install/native build run: total `100.82s`, install `97.48s`, build `1.52s`, fixture `0.45s`, startup `0.25s`, ready `0.66s`, teardown `0.46s`.
- Warm cache run after formatting: total `3.69s`, build `1.31s`, install `0.00s`, fixture `0.38s`, startup `0.26s`, ready `0.40s`, tick `0.86s`, memory `0.00s`, teardown `0.48s`.
- Warm cache command output: `screeps-server-e2e passed fixture=single-owned-spawn user=AliceBot room=W1N9 spawn=Spawn1`.
- Harness refactor run: total `3.65s`, build `1.31s`, install `0.00s`, fixture `0.37s`, startup `0.24s`, ready `0.34s`, tick `0.87s`, memory `0.00s`, teardown `0.52s`.
- Smoke suite registry run: total `4.18s`, build `1.57s`, install `0.00s`, fixture `0.44s`, startup `0.31s`, ready `0.58s`, tick `0.74s`, memory `0.00s`, teardown `0.53s`; passed `basic-runtime-heartbeat` and `memory-schema-write`.
- Post-structure smoke suite run: warm cache total `4.55s`; passed `basic-runtime-heartbeat` and `memory-schema-write`.

## Refactor Notes

- `scripts/screeps-server/run-suite.mjs` remains the only root entrypoint for the stable package script.
- `scripts/screeps-server/framework/harness.mjs` now owns lifecycle orchestration and the public harness API.
- Package cache, status waiting, process cleanup, command execution, output capture, and port reservation live under `scripts/screeps-server/framework/`.
- `single-owned-spawn` seed data and AliceBot/room/spawn/Memory expectations live under `scripts/screeps-server/fixtures/`.
- Suite/case registry and smoke case assertions live under `scripts/screeps-server/cases/`.
- Run-scoped status mod generation lives under `scripts/screeps-server/observability/`.
- Project docs/specs now record the active smoke suite registry and keep package scripts bounded to stable suite entrypoints.

## Rollback Points

- Before local server PoC succeeds, revert only package scripts, docs/specs, tests, and `scripts/screeps-server/`.
- Delete ignored `.screeps/server/` to clear generated install/run state.
- Do not run `deploy:screeps`, `rollback:screeps`, official PTR, or live verification as part of rollback.
