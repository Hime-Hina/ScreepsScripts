# PRD: Bootstrap RCL2 efficiency follow-ups

## Problem

The previous bootstrap construction-efficiency slice fixed worker energy hysteresis, source-first road frontier planning, and assigned-source construction target locality. A follow-up read-only review found additional production-efficiency issues that still affect RCL2 bootstrap rooms even when the live room is healthy.

Current live baseline before this task:

```text
room=W51N21
status=normal
controllerLevel=2
workerCount=5
constructionSites=47
hostiles=0
recoveryState=W51N21:roomHealthy
cpuBucket=10000
moduleHash=d7bc772256bedd34b19846f2697935efac4acad729d00cb0e69e26daa89da321
```

## Must-fix requirements

### 1. Spawn planning must use room-level spawn+extension energy

Runtime spawn snapshots currently use only the concrete spawn store and `SPAWN_ENERGY_CAPACITY`. In Screeps, `spawnCreep` consumes `Room.energyAvailable` / `Room.energyCapacityAvailable`, which include extensions.

Requirements:

- Capture `SpawnSnapshot.availableEnergy` from `spawn.room.energyAvailable`.
- Capture `SpawnSnapshot.energyCapacity` from `spawn.room.energyCapacityAvailable`.
- Keep `spawnName`, `roomName`, and `isSpawning` tied to the concrete spawn.
- Add regression coverage proving a room with 550/550 total energy and spawn store 300/300 selects the 550-cost worker body.

### 2. Multiple workers may build the same construction site in one tick

Screeps allows multiple creeps to `build` the same construction site in the same tick. The current one-site/one-worker reservation spreads progress and delays the first useful extension/container/road completion.

Requirements:

- Replace construction-site id de-duplication with remaining-work reservation.
- Permit multiple working creeps to focus the same highest-priority site until estimated reserved build work can cover its remaining work.
- Keep assigned-source locality before cross-source pile-on.
- Add regression coverage that multiple full/working workers concentrate on the same high-priority/progressed site.

## Should-fix requirements

### 3. Runtime withdrawals must include containers

Source/controller containers are neutral `StructureContainer`, not owned structures. Workers should be able to withdraw energy from containers captured via `FIND_STRUCTURES`.

Requirements:

- Include `STRUCTURE_CONTAINER` with stored energy in `WorkerEnergyWithdrawSnapshot` capture.
- Preserve tombstone, ruin, storage, and terminal withdrawal behavior.
- Add integration coverage where a container from `FIND_STRUCTURES` is used as the worker withdrawal target.

### 4. Worker target ordering should stop using id as primary strategy

Worker target selection still sorts refill, pickup, withdraw, and repair primarily by id. This is arbitrary and can choose far/low-yield targets.

Requirements:

- Capture minimal `x/y` and target type metadata where needed.
- Refill priority: spawn before extension, then larger remaining gap, then nearer to worker, then deterministic tie-breaker.
- Pickup priority: larger amount, then nearer to worker, then deterministic tie-breaker.
- Withdraw priority: container/storage/terminal before tombstone/ruin when otherwise equivalent, then larger available energy, then nearer to worker, then tie-breaker.
- Repair priority: container/spawn/extension before road, then lower hits ratio, then nearer to worker, then tie-breaker.
- Keep id only as final tie-breaker.

### 5. Road backlog should skip road planning before BFS

When construction-site backlog is already at or above the low-priority road threshold, the planner should not compute road paths only to discard them.

Requirements:

- Return container decisions without calling `planRoadDecisions` when active site backlog blocks new roads.
- Add unit coverage for high-backlog container-only behavior.

### 6. Test fake Screeps `FIND_*` constants must match official values

Integration/e2e fake constants must match official Screeps constants to avoid false confidence around runtime boundary calls.

Requirements:

- Update `test/integration/main-loop.test.ts` and `test/e2e/compiled-loop.test.ts` constants to official values used by `@types/screeps`.
- Keep affected test fixtures working with the corrected constants.

## Non-goals

- No live construction-site removal.
- No Screeps Memory or console writes beyond normal deploy/readback/status commands.
- No broad logistics architecture, hauling roles, or stationary miners.
- No tower/defense expansion.

## Acceptance criteria

- [ ] Focused unit/integration tests fail before implementation and pass after implementation.
- [ ] `pnpm vitest run test/unit/spawning/spawn-decision.test.ts test/unit/creeps/worker-decision.test.ts test/unit/construction/construction-planner.test.ts test/integration/main-loop.test.ts test/e2e/compiled-loop.test.ts` passes.
- [ ] `pnpm check` passes.
- [ ] `git diff --check` passes.
- [ ] `python3 ./.trellis/scripts/task.py validate 06-18-bootstrap-rcl2-efficiency-followups` passes.
- [ ] Independent read-only review finds no blocker.
- [ ] `pnpm deploy:screeps` succeeds with readback.
- [ ] Post-deploy `pnpm verify:live:screeps` and `pnpm status:live:screeps` confirm live room remains healthy and module hash matches deployed code.
- [ ] Short monitoring samples show no hostiles, room remains `normal`, heartbeat verified, CPU bucket healthy, and construction/spawn metrics sane.
