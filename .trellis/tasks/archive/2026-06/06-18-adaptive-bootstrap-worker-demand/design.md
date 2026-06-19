# Adaptive bootstrap worker demand design

## Files

- `src/colony/bootstrap-economy.ts`
- `src/spawning/spawn-decision.ts`
- `src/runtime/screeps-runtime.ts`
- `test/unit/colony/bootstrap-economy.test.ts`
- `test/unit/spawning/spawn-decision.test.ts`
- integration/e2e tests if snapshot shape requires updates

## Data contract changes

Add to `BootstrapWorkerDemandInput`:

```ts
sourceCount: number;
workerCreepWorkParts: number;
plannedWorkerWorkParts: number;
```

Add to `SpawningRoomSnapshot`:

```ts
sourceCount: number;
workerCreepWorkParts: number;
```

`plannedWorkerWorkParts` is computed in `spawn-decision.ts` from the largest worker body supported by room energy capacity, not from legacy constants.

## Demand formula

Use constants in `bootstrap-economy.ts`:

```text
SOURCE_ENERGY_PER_TICK = 10
WORKER_UPTIME = 0.8
ENERGY_SPEND_PER_WORK_PART = 1.1
BUILD_DUTY_RATIO = 0.65
BACKLOG_CLEAR_TICKS = 2500
DEVELOPMENT_WORKER_MAX = 10
```

Compute:

```text
effectiveWorkParts = max(plannedWorkerWorkParts, ceil(workerCreepWorkParts / max(workerCount, 1)), 1)
sourceTarget = ceil(sourceCount * 10 / (effectiveWorkParts * 1.1 * 0.8))
backlogTarget = survivalFloor + ceil(constructionBacklog / (BUILD_POWER * effectiveWorkParts * 0.65 * 2500))
developmentTarget = clamp(max(survivalFloor, sourceTarget, backlogTarget), survivalFloor, 10)
```

This is intentionally more aggressive than the earlier backlog-only plan and should move W51N21 from 5 toward 10 while the room is safe and source income supports it.

## Policy gates

- If `workerCreepCount < survivalFloor`: survival demand.
- If `controllerLevel !== 2`: survival demand for this slice.
- If downgrade state is not safe: survival demand.
- Spawn availability does not block demand calculation; execution still skips busy spawns.

## No compatibility mode

The old fixed development target is removed from public behavior and tests.
