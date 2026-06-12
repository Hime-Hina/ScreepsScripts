# P2 structure maintenance and repair fallback design

## Architecture Boundary

Initial implementation can extend `src/creeps/` with repair target decisions because repair is still worker action selection. Do not introduce `src/maintenance/` until repair policy becomes broader than one worker action slice.

Runtime owns:

- structure snapshot capture;
- `Game.getObjectById` resolution;
- `creep.repair(target)` execution;
- out-of-range movement.

## Contracts

```typescript
interface WorkerRepairTargetSnapshot {
  readonly hits: number;
  readonly hitsMax: number;
  readonly id: string;
  readonly roomName: string;
  readonly structureType: 'spawn' | 'extension' | 'container' | 'road';
}

interface RepairStructureDecision {
  readonly creepName: string;
  readonly structureId: string;
  readonly type: 'repairStructure';
}
```

Do not include walls/ramparts in this union in P2. Add a later defense/fortification contract if needed.

## Priority Rule

1. Harvest/pickup/withdraw when empty or not enough energy.
2. Refill spawn/extension.
3. P0 controller emergency upgrade.
4. Repair critical spawn/extension/container/road.
5. Build construction site.
6. Upgrade controller fallback.

## Thresholds

Use explicit threshold functions by structure type, not one shared magic percentage:

- Spawn/extension: critical if below `hitsMax`.
- Container: critical if below a low absolute/percent threshold that prevents decay loss, exact value set in tests.
- Road: critical only if low enough to block logistics value; avoid routine road repair at RCL2.

Threshold constants must live beside the repair selector, not in a generic constants file.

## Tests

- Pure unit tests for target selection by structure type and hits.
- Worker decision tests for repair-before-build.
- Integration test for `FIND_STRUCTURES` snapshot and `creep.repair`.
- Bundle smoke constants update if needed.

## Rollback

- Before deploy: revert worker/runtime/test/docs changes.
- After deploy: `pnpm rollback:screeps`.
