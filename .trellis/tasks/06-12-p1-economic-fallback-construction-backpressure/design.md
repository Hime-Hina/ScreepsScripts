# P1 economic fallback and construction backpressure design

## Architecture Boundary

Recommended ownership:

- `src/creeps/`: per-worker action decision and per-tick target allocation.
- `src/runtime/`: capture dropped resources, tombstones, ruins, eligible store structures; execute pickup/withdraw.
- `src/kernel/`: pass economy/survival snapshot through one complete operation.
- Optional `src/colony/`: only if room-level economic safety becomes too broad for worker decision; it must expose a complete operation, not a generic manager.

Do not add `buildMode`, `options`, or boolean flags. If build is unsafe, represent that as a room-level construction eligibility contract consumed by worker planning.

## Data Flow

```text
runtime worker/economy snapshot
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

## Priority Rule

With P0 already implemented:

1. If creep has free capacity: pickup/withdraw available energy before source harvest.
2. If creep has energy: refill spawn/extension.
3. If controller safety requires upgrade: P0 handles upgrade priority.
4. If construction allowed: build construction site.
5. Otherwise upgrade controller or harvest.

## Reservation Rule

Per tick, sort creeps by name and targets by stable id. Assign each limited target once until its available amount/capacity is exhausted by planned creep capacity.

Do not persist reservations in Memory in P1.

## Tests

- Unit: small dropped energy target is assigned to only one worker.
- Unit: large dropped energy target can support multiple workers only if capacity math says so.
- Unit: construction deferred returns upgrade/build-safe fallback.
- Integration: runtime captures dropped energy and tombstone energy.
- Integration: `creep.pickup` and `creep.withdraw` run through runtime boundary.

## Rollback

- Before live deploy: revert worker/runtime/kernel/test/docs changes.
- After live deploy: `pnpm rollback:screeps`, then `pnpm verify:live:screeps`.
