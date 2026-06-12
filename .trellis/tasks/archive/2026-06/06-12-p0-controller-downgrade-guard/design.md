# P0 controller downgrade guard design

## Architecture Boundary

P0 should extend the existing worker decision slice rather than introducing a broad colony framework.

- `src/runtime/`: capture controller `id`, `roomName`, `level`, `ticksToDowngrade`.
- `src/creeps/`: classify controller downgrade safety and choose worker actions.
- `src/kernel/`: continue orchestrating runtime snapshots and executing worker decisions.
- `test/unit/creeps/`: pure priority behavior.
- `test/integration/`: runtime snapshot and upgrade execution.

## Data Flow

```text
runtime captures WorkerControllerSnapshot
  -> planBootstrapWorkerActions
  -> upgradeController or buildConstructionSite decision
  -> runtime executes Creep.upgradeController / Creep.build
```

## Contracts

```typescript
interface WorkerControllerSnapshot {
  readonly id: string;
  readonly level: number;
  readonly roomName: string;
  readonly ticksToDowngrade: number;
}

type ControllerDowngradeState =
  | { readonly controllerId: string; readonly roomName: string; readonly type: 'controllerDowngradeSafe' }
  | { readonly controllerId: string; readonly roomName: string; readonly type: 'controllerDowngradeRecovering' }
  | { readonly controllerId: string; readonly roomName: string; readonly type: 'controllerDowngradeWarning' }
  | { readonly controllerId: string; readonly roomName: string; readonly type: 'controllerDowngradeCritical' };
```

Do not pass `emergency: boolean`, `mode: 'upgrade'`, or options bags into worker planning.

## Priority Rule

For each room, sort creeps by name for deterministic planning.

- If worker has free capacity, it harvests as today.
- If worker has energy and a spawn/extension needs refill, refill still wins.
- If controller is critical, every full-energy worker in the room upgrades.
- If controller is warning, the first full-energy worker in the deterministic order upgrades; other full-energy workers may build.
- If controller is recovering, the first full-energy worker in the deterministic order keeps upgrading until the controller reaches the safe threshold.
- If controller is safe and construction sites exist, build before upgrade as today.
- If no construction sites exist, upgrade as today.

## Thresholds

Initial constants live beside the downgrade classifier:

```typescript
const CONTROLLER_DOWNGRADE_WARNING_TICKS = 8000;
const CONTROLLER_DOWNGRADE_CRITICAL_TICKS = 5000;
const CONTROLLER_DOWNGRADE_SAFE_TICKS = 9000;
```

The first slice classifies controller safety from the current snapshot:

- `< 5000`: `controllerDowngradeCritical`
- `< 8000`: `controllerDowngradeWarning`
- `< 9000`: `controllerDowngradeRecovering`
- `>= 9000`: `controllerDowngradeSafe`

This keeps build preempted until the controller reaches `9000+` without adding Memory-backed hysteresis in P0. If later tests prove oscillation or over-conservative recovery, add room Memory in a separate task.

## Tests

- Unit tests should prove the priority table through `planBootstrapWorkerActions`.
- Unit tests should cover safe, recovering, warning, critical, and refill-priority cases.
- Integration tests should prove runtime captures `ticksToDowngrade` and still executes `upgradeController`.
- Bundle smoke should include `ticksToDowngrade` in controller stubs if compiled runtime requires it.

## Rollback

- Before deploy: revert worker/runtime/test/docs changes.
- After deploy: run `pnpm rollback:screeps`, then `pnpm verify:live:screeps`.
