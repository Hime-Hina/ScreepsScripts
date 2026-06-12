# P3 PTR defense drill implementation plan

## Phase 1: PTR feasibility and room replication

1. Add focused tests for PTR state reads.
   - Given `screeps.ptr.json` is loaded, when PTR account/overview/shard/code endpoints are requested, then the PTR API client uses `https://screeps.com/ptr/api/` and `X-Token`.
   - Mock boundary: network and credential file only.

2. Add PTR room replication tests before the command code.
   - Given PTR overview has no owned rooms and PTR `place-spawn` returns `ok=1`, when the replication operation targets `shard1 / W51N21` and `Spawn1` at `35,23`, then it reports the founded room without printing secrets.
   - Given PTR rejects the room or coordinate, then the operation reports a blocked reason and does not try another room.
   - Given PTR already has the target room and spawn, then the operation verifies it without calling `place-spawn`.

3. Implement the smallest explicit PTR room founding operation.
   - Keep it separate from `verify:ptr:screeps` and `deploy:ptr:screeps`.
   - Do not add live fallback, local server fallback, or hostile creation to the same command.

4. Run PTR feasibility.
   - Verify account, shard, overview, code hash, and target room state.
   - Attempt PTR room replication if the account still has no room.
   - Record observed or blocked facts in `docs/game-state.md`.

## Phase 2: PTR code and natural tick

1. Run the existing local gate before PTR deploy.
   - `pnpm check`

2. Deploy to PTR if the room exists.
   - `pnpm deploy:ptr:screeps`
   - Confirm readback hash and rollback snapshot.

3. Observe natural tick separately.
   - Use PTR overview / console / room readback evidence that proves code ran after deploy.
   - Record `blocked` if only API code readback is available.

## Phase 3: PTR hostile drill

1. Identify the authorized hostile creation mechanism.
   - Official PTR capability or explicitly authorized second account only.
   - No browser cookie extraction.
   - No live hostile creation.

2. If hostile creation is available, run one controlled drill.
   - Create or observe a hostile with active attack or dismantle capability near the PTR core structure.
   - Observe runtime hostile capture, `roomUnsafe`, safe mode decision, and safe mode execution if PTR charge risk is accepted.
   - Record shard, room, branch, module hash, hostile evidence, safe mode result, and rollback state.

3. If hostile creation is unavailable, record PTR hostile drill as blocked and enter local fallback.

## Phase 4: Local official server fallback

1. Add focused tests for runner registry growth.
   - Given the new local defense case name, when the registry reads `case <name>`, then it selects one fixture and one case.
   - Given incompatible fixture cases are mixed, the existing shared-fixture guard still rejects the run.

2. Add a local official server fixture for the defense drill.
   - Seed an owned room with spawn/controller/core structure.
   - Seed a hostile creep near the core with active attack or dismantle parts.
   - Seed controller fields so safe mode activation is possible.

3. Add a local official server case.
   - Run through `node scripts/screeps-server/run-suite.mjs case defense-core-threat-safe-mode`.
   - Assert natural tick heartbeat.
   - Assert safe mode or equivalent local storage/status evidence after the tick.

4. Record fallback evidence in `docs/game-state.md`.
   - Label it as local official server evidence.
   - Keep PTR blocked facts separate.

## Validation Commands

- Focused PTR tooling tests: `pnpm test:integration -- <new ptr test file>` or the existing closest test command after file creation.
- Focused local runner tests: `pnpm test:system -- <new runner contract test file>` or the existing closest test command after file creation.
- Full local gate: `pnpm check`.
- Local official server fallback: `node scripts/screeps-server/run-suite.mjs case defense-core-threat-safe-mode`.
- PTR readback/deploy commands only after feasibility gates pass: `pnpm verify:ptr:screeps`, `pnpm deploy:ptr:screeps`, `pnpm rollback:ptr:screeps` if needed.

## Risky Files And Rollback Points

- `scripts/screeps/ptr-api.mjs`: credentialed network boundary; tests must prove no token output.
- `scripts/screeps/*.mjs`: new PTR room operation must not read live config.
- `scripts/screeps-server/fixtures/`: fixture data can break local server boot if official DB assumptions are wrong.
- `scripts/screeps-server/observability/`: status mod must not alter game semantics.
- `docs/game-state.md`: must separate `observed`, `derived`, and `blocked`.
- `.screeps/ptr/latest.json`: ignored rollback snapshot for PTR code only.

## Start Gate

Do not run `python .trellis/scripts/task.py start` until:

- `prd.md`, `design.md`, and `implement.md` are reviewed.
- The PTR room replication target remains `shard1 / W51N21`, `Spawn1`, `35,23`.
- The user accepts that local official server fallback validates engine behavior but does not count as PTR success.

## Execution Notes

- PTR room replication succeeded: `Spawn1` exists at `shard1 / W51N21`, `35,23`.
- PTR P3 code deploy/readback succeeded with module set hash `1390d63ac0a329c9d0fb591d84b7670f04ce89a6b946cfc11b3a1d17512a335f`.
- PTR natural tick remained blocked: account CPU allocation is `shard1 = 80`, but runtime `shards/info` and Chrome `#!/shards2` still show `shard1` with no CPU limit; CPU reassignment is cooling down until `2026-06-13 15:10:50 +08:00`.
- PTR hostile drill is blocked until natural tick and an authorized hostile creation mechanism exist.
- Local official server fallback succeeded through `node scripts/screeps-server/run-suite.mjs case defense-core-threat-safe-mode`, observing natural tick heartbeat and `safe-mode-active`.
