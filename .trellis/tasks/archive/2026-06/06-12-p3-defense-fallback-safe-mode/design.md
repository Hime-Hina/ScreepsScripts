# P3 defense fallback and safe mode design

## Architecture Boundary

Add `src/defense/` only when implementing pure defense decisions. Runtime remains the only owner of Screeps globals and action calls.

```text
runtime defense snapshot -> src/defense planRoomDefense -> defense decisions -> runtime execution
```

## Contracts

```typescript
interface DefenseHostileCreepSnapshot {
  readonly bodyParts: readonly string[];
  readonly hits: number;
  readonly id: string;
  readonly owner: string;
  readonly roomName: string;
  readonly x: number;
  readonly y: number;
}

interface DefenseControllerSnapshot {
  readonly id: string;
  readonly roomName: string;
  readonly safeModeAvailable: number;
  readonly safeModeCooldown?: number;
  readonly upgradeBlocked?: number;
}

type DefenseDecision =
  | ActivateSafeModeDecision
  | TowerAttackDecision
  | TowerHealDecision
  | TowerRepairDecision;
```

## Safe Mode Rule

Trigger only when all are true:

- hostile has `ATTACK`, `RANGED_ATTACK`, `WORK`, or enough threat body parts defined by tests;
- hostile is near spawn or another critical owned structure;
- controller has `safeModeAvailable > 0`;
- controller is not blocked by `safeModeCooldown` or `upgradeBlocked`;
- room is not already in safe mode.

Do not trigger for a harmless MOVE-only scout in P3.

## Tower Rule

When towers exist:

1. Attack hostile creep that can damage/dismantle and is inside owned room.
2. Heal damaged own creep if no attack target exists.
3. Repair critical owned structure if tower energy remains and no attack/heal target exists.

Tower decision must be explicit; do not hide attack/heal/repair behind a generic tower action with a mode string.

## Tests

- Pure unit tests for hostile classification.
- Pure unit tests for safe mode trigger matrix.
- Integration tests for `FIND_HOSTILE_CREEPS`, controller snapshot, `activateSafeMode`.
- Tower tests only if tower action is implemented in this task.

## Rollback

Safe mode execution affects live state. Before deployment, run full local gates. After deployment issue, rollback code with `pnpm rollback:screeps`; note that consumed safe mode cannot be undone.
