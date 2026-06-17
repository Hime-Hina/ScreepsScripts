# Design: Bootstrap RCL2 efficiency follow-ups

## Architecture constraints

Keep the existing data-driven boundary:

```text
runtime capture -> typed snapshots -> pure planners -> decisions -> runtime execution
```

Runtime Screeps globals stay in `src/runtime/screeps-runtime.ts`. Domain modules remain pure and receive only typed snapshots.

## Design decisions

### Room-level spawn energy

`SpawnSnapshot` already models the energy available to execute a spawn decision. The runtime capture should populate it with the room-level values that `spawnCreep` uses:

```typescript
availableEnergy: spawn.room.energyAvailable
energyCapacity: spawn.room.energyCapacityAvailable
```

No change is needed in `src/spawning/spawn-decision.ts` selection logic. The bug is the runtime boundary value.

### Construction-site remaining-work reservation

Replace `reservedConstructionSiteIds` with `reservedConstructionWorkById`:

```text
remainingWork = progressTotal - progress
estimatedWorkerBuildWork = min(worker.energy, worker active/work estimate)
reservedWork += estimatedWorkerBuildWork
eligible while remainingWork - reservedWork > 0
```

The current worker snapshot does not capture active WORK parts. Use energy as a conservative upper bound for build work in this slice. It is safe for the target behavior: multiple workers can concentrate while a site has meaningful remaining work, and tiny nearly-complete sites will not attract unlimited workers.

Assigned-source locality remains part of site ranking before reservation capacity is applied. This prevents removing the one-site/one-worker guard from causing all workers to converge on the same source side when another assigned source has useful local work.

### Container withdrawal capture

Keep tombstone and ruin capture unchanged. Extend structure withdrawal capture to include containers from `FIND_STRUCTURES`, because containers are neutral and do not appear in `FIND_MY_STRUCTURES`.

Avoid duplicate structure snapshots by collecting owned withdrawal structures and containers through a single structure pass or by de-duplicating ids.

### Worker target ordering

Add optional metadata to worker snapshots where runtime already has it:

- `WorkerEnergyStructureSnapshot`: `structureType`, `x`, `y`.
- `WorkerEnergyPickupSnapshot`: `x`, `y`.
- `WorkerEnergyWithdrawSnapshot`: `targetType`, `x`, `y`.
- `WorkerRepairTargetSnapshot`: `x`, `y`.

Sorter rules:

- Refill: same-room underfilled structures; spawn before extension; larger remaining gap after reservation; closer to worker; id tie-breaker.
- Pickup: remaining amount after reservation; closer to worker; id tie-breaker.
- Withdraw: structure withdrawals before tombstones/ruins for logistics stability; larger available energy after reservation; closer to worker; id tie-breaker.
- Repair: supported critical repairs; container/spawn/extension before road; lower `hits / hitsMax`; closer to worker; id tie-breaker.

When position metadata is absent, distance is `Infinity`, preserving deterministic fallback.

### Road backlog early exit

Extract a predicate such as `canPlanLowPriorityRoads(ownedRoom)`. Use it before `planRoadDecisions` and in the limiter if needed:

```text
containerDecisions = ...
if backlog >= threshold: return containerDecisions
roadDecisions = planRoadDecisions(...)
return [...containerDecisions, ...limit...]
```

### Fake Screeps constants

Update fake constants to the official numeric values from `@types/screeps` for the constants used by integration/e2e tests:

```text
FIND_HOSTILE_CREEPS = 103
FIND_SOURCES = 105
FIND_DROPPED_RESOURCES = 106
FIND_STRUCTURES = 107
FIND_MY_STRUCTURES = 108
FIND_CONSTRUCTION_SITES = 111
FIND_TOMBSTONES = 118
FIND_RUINS = 123
FIND_MY_CONSTRUCTION_SITES = 114
FIND_MINERALS = 116
```

## Test plan

1. Integration regression: runtime spawn snapshot uses `room.energyAvailable = 550` and `room.energyCapacityAvailable = 550` even when spawn store is `300/300`, and the executed `spawnCreep` body is the 550 body.
2. Worker unit regression: multiple working creeps may build the same highest-priority/progressed construction site when remaining work allows it.
3. Integration regression: a container returned by `FIND_STRUCTURES` with energy is captured as a withdrawal target and worker withdraws from it.
4. Worker unit regressions for refill/pickup/withdraw/repair strategic ordering instead of id primary ordering.
5. Construction unit regression: high construction-site backlog still creates needed containers but skips road planning/output.
6. Integration/e2e still pass with corrected fake constants.
