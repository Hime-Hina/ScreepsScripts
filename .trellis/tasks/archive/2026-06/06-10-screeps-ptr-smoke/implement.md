# 接入 Screeps 官方 PTR 冒烟验证 Implementation

## Checklist

- [x] Add focused tests for PTR script taxonomy: PTR commands exist and stay outside `pnpm check`.
- [x] Add focused tests for ignored PTR credential/snapshot paths.
- [x] Add PTR config tests: missing file, invalid JSON, missing branch/token, and no secret leakage in error messages.
- [x] Add PTR API URL/readback tests with mocked `fetch`; assert `https://screeps.com/ptr/api/user/code` is used.
- [x] Add PTR deploy/readback command tests with temp workspace and mocked API responses.
- [x] Add PTR rollback command tests: missing snapshot, branch mismatch, restored readback mismatch, and successful restore.
- [x] Add `screeps.ptr.example.json` and update `.gitignore`.
- [x] Implement PTR config reader and PTR API/deploy/verify/rollback command modules.
- [x] Update `package.json` scripts with explicit PTR command names.
- [x] Update docs with PTR reset, CPU subscription activation, readback vs natural tick, and blocked-result recording.
- [x] Update task `implement.jsonl` / `check.jsonl` with relevant spec and official-doc references.
- [x] Run focused tests, then `pnpm check`.
- [x] If credentials and PTR state are available, run PTR readback/deploy manually and record result or blocked reason in `docs/game-state.md`.

## Behavior Slices

1. Script taxonomy slice
   - Public interface: `package.json`, `test/system/project-scripts.test.ts`.
   - Expected behavior: PTR scripts are explicit and are not included in `pnpm check`.
   - Boundary: no network or credentials.

2. PTR config slice
   - Public interface: PTR config reader and `screeps.ptr.example.json`.
   - Expected behavior: PTR commands require independent branch/token config and reject missing or malformed config without printing secrets.
   - Boundary: temp filesystem only.

3. PTR API base slice
   - Public interface: PTR API URL/readback/upload functions.
   - Expected behavior: code read/write requests use `https://screeps.com/ptr/api/user/code`, never live `/api/user/code`.
   - Boundary: mocked `fetch`.

4. PTR readback slice
   - Public interface: `verify:ptr:screeps`.
   - Expected behavior: current `dist/main.js` matches PTR remote `main`; output states API readback status and natural tick status separately.
   - Boundary: mocked API in tests; official PTR only in manual validation.

5. PTR deploy slice
   - Public interface: `deploy:ptr:screeps`.
   - Expected behavior: command snapshots previous PTR modules, uploads local `main`, verifies readback, and logs branch/modules/hash/snapshot path.
   - Boundary: mocked API in tests; official PTR only in manual validation.

6. PTR rollback slice
   - Public interface: `rollback:ptr:screeps`.
   - Expected behavior: command restores the saved PTR snapshot, verifies readback, and stops on missing snapshot or branch mismatch.
   - Boundary: mocked API in tests; official PTR only in manual validation.

7. PTR natural tick documentation slice
   - Public interface: `docs/development.md` and `docs/game-state.md`.
   - Expected behavior: operator can record observed PTR tick evidence or blocked reason without confusing it with API readback.
   - Boundary: documentation only unless manual PTR validation is available.

## Validation Commands

```powershell
pnpm test:system
pnpm test:integration
pnpm test:bundle
pnpm check
```

Manual online validation, only when PTR credentials and CPU subscription are available:

```powershell
pnpm deploy:ptr:screeps
pnpm verify:ptr:screeps
pnpm rollback:ptr:screeps
```

## Validation Results

- 2026-06-11 focused PTR tests passed: `.\node_modules\.bin\vitest.cmd run test/unit/screeps-deployment/config.test.ts test/integration/screeps-deployment/screeps-api.test.ts test/integration/screeps-deployment/ptr-commands.test.ts`, 3 files / 32 tests.
- 2026-06-11 `pnpm check` passed: typecheck, lint, format, coverage, system tests, and bundle smoke.
- 2026-06-11 `trellis-check` found and fixed a PTR config edge issue: `screeps.ptr.json` now allows only `branch` and `token`; live profile, endpoint, cookie, and password fields fail at the config boundary.
- 2026-06-11 post-review focused PTR tests passed: `.\node_modules\.bin\vitest.cmd run test/unit/screeps-deployment/config.test.ts test/integration/screeps-deployment/screeps-api.test.ts test/integration/screeps-deployment/ptr-commands.test.ts`, 3 files / 32 tests.
- 2026-06-11 post-review `pnpm check` passed: typecheck, lint, format, coverage, system tests, and bundle smoke.
- 2026-06-11 official PTR online commands were not run. `screeps.ptr.json` is absent in the current workspace, and no PTR token was safely available or explicitly authorized. `docs/game-state.md` records PTR readback, natural tick, and rollback as `blocked`.
- 2026-06-12 manual PTR follow-up: Chrome opened `https://screeps.com/ptr/#!/console`, but PTR redirected to map and showed `Select your room` / `Choose a room to found your colony`. PTR API returned account CPU `80`, `cpuShard = { shard3: 80 }`, and `rooms = []` for `shard0` through `shard3`; no `[tick ...]` heartbeat appeared in the DOM or browser console during a 30-second observation. `pnpm verify:ptr:screeps` now fails because PTR remote hash `9611f3c2a384ca80813c8d79979624bbf8f424efad9e4ecac849c32ac62b6d62` does not match current local hash `87534439e365323bb9d223627cb1b21593b75384d36604cdbdd469737a152df8`. Current conclusion: natural tick is blocked by missing PTR owned room after reset, not by inactive PTR CPU subscription; no full PTR environment stall was observed.

## Risk Points

- URL construction with `new URL('/api/user/code', 'https://screeps.com/ptr/api/')` would incorrectly drop `/ptr/api/`; PTR URL builders must append relative endpoint paths.
- Sharing the live config reader would preserve the `protocol/server` model and make accidental live targeting harder to rule out.
- Any `_token` query parameter would put credentials into URLs and logs; use `X-Token`.
- PTR reset can wipe scripts between deploy and verify. Treat that as blocked/external state, not as a successful smoke.
- CPU subscription deactivation can prevent natural tick evidence after reset. Record the blocked reason.
- Do not add PTR to `pnpm check`, CI defaults, or local official server e2e case selection.
- Do not use browser cookies or account passwords as fallback credentials.

## Rollback Points

- Before online validation, revert PTR-only scripts, config example, tests, and docs.
- After PTR deploy, use `pnpm rollback:ptr:screeps` to restore the PTR snapshot under `.screeps/ptr/` and record the action.
- Live rollback is not involved.
