# Live heartbeat readback verification implementation plan

## Slice 1: Live account identity API

Public interface:

- `readLiveAccountIdentity(screepsConfig)` in `scripts/screeps/screeps-api.mjs`

Red test:

- Add integration test proving `GET /api/auth/me` uses `X-Token`, returns account id, and rejects payloads without an account id.

Green implementation:

- Add URL builder for `/api/auth/me`.
- Decode `_id` and optional `username` at the API boundary.

## Slice 2: Console websocket P4 heartbeat success

Public interface:

- `checkLiveSurvivalStatusFrom(workspacePath, ['--shard', 'shard1', '--room', 'W51N21'])`

Red test:

- Extend live status integration test with mocked `fetch` and mocked `WebSocket`.
- Simulate open, `auth ok`, and a target-shard console event containing:

```text
[tick 71650000] cpu=0.63 bucket=9876 limit=20 tickLimit=500 budget=full rooms=W51N21:workers=5:spawnEnergy=300/300:construction=5:hostiles=0
```

- Assert output contains existing survival summary plus `naturalTickHeartbeat=verified` fields.

Green implementation:

- Add command-local console websocket readback operation.
- Add frame decoder and heartbeat parser owned by `live-survival-status.mjs`.
- Keep all output token/module-source safe.

## Slice 3: Console websocket failure paths

Public interface:

- `checkLiveSurvivalStatusFrom(...)`

Red tests:

- Simulate console event with `[tick] cpu=...` but no `bucket`.
- Simulate console event on another shard.
- Simulate websocket `auth failed` or close before matching heartbeat.

Expected behavior:

- Command rejects with `LiveSurvivalStatusError`.
- No `naturalTickHeartbeat=verified` line is printed.
- Error text does not contain token.

Green implementation:

- Fail closed on timeout/close/auth failure/malformed heartbeat.
- Do not introduce API-only fallback.

## Slice 4: Documentation

Files:

- `docs/development.md`
- `docs/game-state.md`

Expected behavior:

- Docs say `status:live:screeps` verifies P4 natural console heartbeat through live console websocket.
- Docs keep API readback separate from live runtime evidence.

## Validation Commands

```powershell
node_modules\.bin\vitest.cmd run test\integration\screeps-deployment\screeps-api.test.ts test\integration\screeps-deployment\live-survival-status.test.ts
pnpm test:system
pnpm check
```

If `screeps.json` is present and the mocked tests pass, run the explicit live read-only command:

```powershell
pnpm status:live:screeps
```

Record either the observed live heartbeat result or the blocked reason in `docs/game-state.md`.

## Validation Results

- `node_modules\.bin\vitest.cmd run test\integration\screeps-deployment\screeps-api.test.ts test\integration\screeps-deployment\live-survival-status.test.ts` passed: 2 files, 25 tests.
- `pnpm test:system` passed: build plus 2 files, 6 tests.
- `pnpm check` passed: typecheck, lint, format, coverage, system, bundle.
- `pnpm status:live:screeps` passed and observed `naturalTickHeartbeat=verified` for `shard1 / W51N21`, tick `71640676`, CPU `0.10`, bucket `10000`, limit `20`, tickLimit `500`, budget `full`, room summary `workers=5 spawnEnergy=269/300 construction=5 hostiles=0`.

## Risky Files

- `scripts/screeps/live-survival-status.mjs`
  - Must stay read-only and fail closed when no P4 heartbeat is observed.
- `scripts/screeps/screeps-api.mjs`
  - Shared live API boundary; avoid changing deploy/upload behavior.
- `test/support/screeps-deployment-modules.ts`
  - Type guards must track new exports without weakening module checks.
- `docs/game-state.md`
  - Must not record API readback as natural tick evidence.
