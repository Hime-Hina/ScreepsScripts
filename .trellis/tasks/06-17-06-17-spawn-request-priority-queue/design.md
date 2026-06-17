# Design: Spawn request priority queue and early role body catalog

## Current behavior

`planBootstrapWorkerSpawn(world)` iterates spawns, reads room demand, checks worker target, spawn availability, selects the largest affordable early worker body, then returns a single `SpawnDecision`.

## Proposed behavior

Split planning into two pure phases while keeping external behavior stable:

1. Create zero or more `SpawnRequest` objects from room/spawn snapshots.
2. Select the highest-priority executable request and convert it to `SpawnDecision`.

Possible internal shape:

```ts
interface SpawnRequest {
  readonly priority: number;
  readonly requestType: 'survivalWorker' | 'rcl2DevelopmentWorker';
  readonly roomName: string;
  readonly spawnName: string;
  readonly bodyOptions: readonly (readonly SpawnBodyPart[])[];
}
```

Priority starting point:

- survival worker below 3: highest.
- RCL2 development worker below 5: lower.

## Compatibility

- Keep creep name format `${spawnName}-worker-${gameTime}` unless tests deliberately update it.
- Keep `EARLY_WORKER_BODIES` order and body cost calculation.
- Do not expose generic `manager` naming; keep in `src/spawning/` domain.

## Future extension

Later tasks can add requests for source miners, haulers/refillers, defenders, claimers, or remote workers without changing runtime execution.
