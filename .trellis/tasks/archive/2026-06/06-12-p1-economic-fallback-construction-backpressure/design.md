# P1 economic fallback and construction backpressure design

## Architecture Boundary

Recommended ownership:

- `src/creeps/`: per-worker action decision and per-tick target allocation.
- `src/spawning/`: bootstrap worker demand and spawn target calculation.
- `src/runtime/`: capture dropped resources, tombstones, ruins, eligible store structures; execute pickup/withdraw.
- `src/memory/`: clean stale top-level `Memory.creeps` entries at the raw Memory boundary.
- `src/kernel/`: pass economy/survival snapshot through one complete operation.
- Optional `src/colony/`: only if room-level economic safety becomes too broad for worker decision; it must expose a complete operation, not a generic manager.

Do not add `buildMode`, `options`, or boolean flags. If build is unsafe, represent that as a room-level construction eligibility contract consumed by worker planning.

## Data Flow

```text
runtime worker/economy snapshot
  -> memory hygiene
  -> spawning demand calculation
  -> pure worker/economy planner
  -> worker action decisions
  -> runtime pickup/withdraw/build/refill/upgrade execution
```

## Contracts

### Worker energy source snapshot

```typescript
interface WorkerEnergyPickupSnapshot {
  readonly amount: number;
  readonly id: string;
  readonly roomName: string;
}

interface WorkerEnergyWithdrawSnapshot {
  readonly availableEnergy: number;
  readonly id: string;
  readonly roomName: string;
}
```

### Official constants snapshot

P1 should capture Screeps official constants at the runtime boundary and pass narrow typed values to pure planners. This keeps tests deterministic and avoids strategy modules reading globals.

```typescript
interface ScreepsEconomyConstantsSnapshot {
  readonly bodyPartCosts: Readonly<Record<SpawnBodyPart, number>>;
  readonly constructionCosts: Readonly<Record<BuildableStructureConstant, number>>;
  readonly controllerStructures: Readonly<
    Record<BuildableStructureConstant, Readonly<Record<number, number>>>
  >;
}
```

Use these for:

- RCL structure limits: `CONTROLLER_STRUCTURES`.
- Construction backlog/cost: `CONSTRUCTION_COST`.
- Spawn body cost: `BODYPART_COST`.

Do not use official constants as a dumping ground for project policy. P0 thresholds such as warning/recovering/critical downgrade ticks remain policy constants unless a later task explicitly redesigns them.

### Memory cleanup

Screeps stores legacy creep memory under top-level `Memory.creeps`. Current project-owned state uses `Memory.screepsScripts`. P1 should add a complete memory-boundary operation that deletes stale `Memory.creeps[name]` entries when `Game.creeps[name]` is absent, while preserving entries for live creeps and preserving `Memory.screepsScripts`.

### New decisions

```typescript
interface PickupEnergyDecision {
  readonly creepName: string;
  readonly resourceId: string;
  readonly type: 'pickupEnergy';
}

interface WithdrawEnergyDecision {
  readonly creepName: string;
  readonly structureId: string;
  readonly type: 'withdrawEnergy';
}
```

### Construction eligibility

The planner needs one explicit input that states the business condition for construction. Use a union, not a boolean flag, string mode, or options bag:

```typescript
type RoomConstructionEligibility =
  | { readonly roomName: string; readonly type: 'constructionAllowed' }
  | { readonly roomName: string; readonly type: 'constructionDeferredForSurvival' };
```

### Bootstrap worker demand

The current hard cap `BOOTSTRAP_WORKER_COUNT = 3` should become a minimum survival population plus an expansion target guarded by room economy state.

```typescript
type BootstrapWorkerDemand =
  | { readonly targetWorkerCount: 3; readonly type: 'survivalWorkerDemand' }
  | { readonly targetWorkerCount: 5; readonly type: 'rcl2ConstructionWorkerDemand' };
```

Initial P1 rules:

- `survivalWorkerDemand`: used when controller downgrade state is not safe, spawn/extension energy is unstable, no construction backlog exists, or worker count is below the minimum survival floor.
- `rcl2ConstructionWorkerDemand`: used only at RCL2 when controller downgrade state is safe, spawn/extension energy is stable, construction backlog exists, and spawn is not already spawning.
- The target count is a demand result, not a boolean mode or an options bag passed into spawning.
- P1 uses count-based demand first. Body-part capacity planning can replace this in a later task when container/hauler roles exist.

## Priority Rule

With P0 already implemented:

1. If creep has free capacity: pickup/withdraw available energy before source harvest.
2. If creep has energy: refill spawn/extension.
3. If controller safety requires upgrade: P0 handles upgrade priority.
4. If construction allowed: build construction site.
5. Otherwise upgrade controller or harvest.

## Spawn Demand Rule

For RCL2 bootstrap:

```text
target = survival minimum 3
if controller safe and refill stable and construction backlog exists:
  target = min(5, economic expansion cap)
spawn while workerCreepCount < target
```

The initial `economic expansion cap` is `5`. It is deliberately conservative until source access, container mining, and hauling capacity are modeled explicitly.

## Reservation Rule

Per tick, sort creeps by name and targets by stable id. Assign each limited target once until its available amount/capacity is exhausted by planned creep capacity.

Do not persist reservations in Memory in P1.

## Tests

- Unit: stale top-level `Memory.creeps` entries are deleted while live creep entries and `Memory.screepsScripts` are preserved.
- Integration: `loop()` performs creep memory cleanup through the runtime/memory boundary using stubbed `Game.creeps` and `Memory.creeps`.
- Unit: spawn body cost and RCL2 structure/backlog calculations consume captured official constants.
- Unit: small dropped energy target is assigned to only one worker.
- Unit: large dropped energy target can support multiple workers only if capacity math says so.
- Unit: construction deferred returns upgrade/build-safe fallback.
- Integration: runtime captures dropped energy and tombstone energy.
- Integration: `creep.pickup` and `creep.withdraw` run through runtime boundary.

## Rollback

- Before live deploy: revert worker/runtime/kernel/test/docs changes.
- After live deploy: `pnpm rollback:screeps`, then `pnpm verify:live:screeps`.
