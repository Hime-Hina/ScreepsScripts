# P3 PTR defense drill design

## Operation Boundaries

This task has three separate operation boundaries.

1. PTR room replication
   - Uses `screeps.ptr.json` only.
   - Targets the documented main-room shape: `shard1 / W51N21`, spawn `Spawn1` at `35,23`.
   - Reads PTR account, shard, overview, room status, room objects, and code state through PTR endpoints.
   - If PTR has no owned room, attempts official PTR room founding through the PTR `place-spawn` capability.
   - Stops and records `blocked` when PTR rejects the target room, target coordinate, CPU state, token, or shard availability.

2. PTR defense drill
   - Uses existing PTR code deploy/readback for code synchronization.
   - Treats natural tick evidence as a separate observation from `verify:ptr:screeps`.
   - Creates a hostile only through an official PTR capability or explicitly authorized second-account mechanism.
   - Stops and records `blocked` if hostile creation requires private GM ability, unapproved cookies, live credentials, or manual browser state that cannot be reproduced.

3. Local official server fallback
   - Runs only after PTR replication or PTR hostile creation is blocked.
   - Uses the existing `scripts/screeps-server/` harness with a new fixture/case, not PTR credentials.
   - Seeds owned room state plus a near-core hostile threat in the local official server database.
   - Records the result as local official server evidence, not PTR evidence.

Existing `deploy:ptr:screeps`, `verify:ptr:screeps`, and `rollback:ptr:screeps` remain code module operations. They must not grow room founding, hostile creation, or local-server behavior through flags.

## PTR Room Replication

The PTR replication target is an operational target copied from `docs/game-state.md`, not a production strategy invariant.

Target:

- shard: `shard1`
- room: `W51N21`
- spawn name: `Spawn1`
- spawn position: `35,23`

If code is needed, the command boundary should be an explicit PTR command such as `scripts/screeps/found-ptr-room.mjs` plus a package script with a PTR-specific name. Its arguments may be target data such as shard, room, spawn name, and coordinates; they must not switch between PTR, live, deploy, rollback, or local server behavior.

The command should complete one operation: ensure the PTR target room exists for the configured PTR account. It may verify an already matching room or place the spawn when no room exists. It must not repair partial mismatches through silent fallback to another room.

## PTR Data Flow

```text
screeps.ptr.json
  -> PTR config boundary
  -> PTR API client
  -> account / shards / overview / room status / room objects / code readback
  -> non-secret operation report
  -> docs/game-state.md
```

PTR writes are limited to:

- code upload through the existing PTR deploy operation
- room founding through PTR `place-spawn`, if available
- account CPU shard allocation through PTR `user/cpu-shards`, only when the current account allocation does not already match the target and the 12-hour cooldown risk is accepted

No PTR operation may read `screeps.json`, live API base fields, account passwords, browser cookies, or live server room objects except as already documented facts.

## PTR CPU Boundary

PTR CPU has two observable surfaces:

- Account allocation: `GET /ptr/api/auth/me`, field `cpuShard`.
- Runtime limit: `GET /ptr/api/game/shards/info`, field `shards[].cpuLimit`, and browser `#!/shards2` "CPU limit".

`cpuShard` matching the target does not prove the shard is ticking. Runtime CPU and room-object progression must be observed separately. `POST /ptr/api/user/cpu-shards` uses body `{ cpu: { shard0, shard1, shard2, shard3 } }` and is blocked for 12 hours after a change.

## Hostile Drill Decision

The PTR hostile drill can start only when all prerequisites are observed:

- PTR target room exists and is owned by the PTR account.
- Current code is deployed and read back on the configured PTR branch.
- Natural tick evidence is observed after deploy.
- Hostile creation mechanism is official or explicitly authorized.
- Safe mode charge risk is accepted for PTR.

If any prerequisite is missing, the PTR hostile drill is blocked. The fallback can still validate the P3 defense behavior in the local official server.

## Local Server Fallback

The fallback should extend the existing local server e2e boundary:

- Add a fixture that seeds an owned room, controller safe-mode availability, core structure, and a hostile creep near the core.
- Add a runner case such as `defense-core-threat-safe-mode`.
- Keep the suite/case/fixture registry as the public selection boundary.
- Observe natural tick through the existing status stream.
- Observe safe mode / room unsafe evidence through a status event or storage readback owned by the local harness.

The fixture must not change Screeps constants, runner semantics, intent processing, or player sandbox behavior.

Current fallback case:

- `node scripts/screeps-server/run-suite.mjs case defense-core-threat-safe-mode`
- fixture `defense-core-threat`
- expected evidence: natural tick heartbeat followed by `safe-mode-active` for the seeded controller and hostile creep

## Public Interfaces Under Test

PTR tooling:

- PTR config reader for `screeps.ptr.json`.
- PTR API client URL construction, auth header use, response decoding, bounded read retry, and write failure handling.
- PTR room founding command boundary, if implemented.

Local fallback:

- `scripts/screeps-server/run-suite.mjs` case selection.
- case registry entry for the defense drill case.
- fixture preparation for hostile room state.
- harness/status observation of natural tick and defense outcome.

P3 strategy behavior remains under the existing public interfaces:

- `planRoomDefense(world: DefenseWorldSnapshot): RoomDefensePlan`
- `runTick(runtime: ScreepsTickRuntime)`
- `loop()` through the runtime boundary

## Mock Boundaries

Allowed mocks:

- PTR network calls.
- credential files.
- filesystem writes under ignored `.screeps/`.
- time for deterministic snapshot/report tests.
- Screeps globals at source-level integration boundaries.

Do not mock:

- `src/defense/` inside runtime or kernel tests.
- local official server runner behavior in fallback e2e.
- internal strategy modules to force a defense result.

## Rollback And Risk

- PTR code replacement already has `.screeps/ptr/latest.json` rollback support.
- PTR room founding may not have an automatic rollback path. If founding succeeds, record the room as the new PTR state instead of trying to erase it.
- Live server state is read-only for this task.
- No safe mode charge may be consumed on live.
- PTR safe mode consumption must be called out before an execute-run.
