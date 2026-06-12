# RCL2 worker energy-flow decisions design

## Scope

This child owns pure worker action planning only.

Write ownership:

- `src/creeps/worker-decision.ts`
- `test/unit/creeps/worker-decision.test.ts`

Do not edit:

- `src/runtime/screeps-runtime.ts`
- `src/kernel/run-tick.ts`
- integration/e2e tests
- docs

## Public Interface

Existing public interface remains:

```typescript
planBootstrapWorkerActions(workerWorld: WorkerWorldSnapshot): readonly WorkerActionDecision[]
```

Extend the snapshot with pure data:

```typescript
interface WorkerEnergyStructureSnapshot {
  readonly availableEnergy: number;
  readonly energyCapacity: number;
  readonly id: string;
  readonly roomName: string;
}

interface WorkerConstructionSiteSnapshot {
  readonly id: string;
  readonly roomName: string;
}
```

Expected decision additions:

```typescript
interface RefillEnergyStructureDecision {
  readonly creepName: string;
  readonly structureId: string;
  readonly type: 'refillEnergyStructure';
}

interface BuildConstructionSiteDecision {
  readonly constructionSiteId: string;
  readonly creepName: string;
  readonly type: 'buildConstructionSite';
}
```

`refillSpawn` should be removed as a long-term action concept and replaced with `refillEnergyStructure`.

## Priority Contract

For each worker:

1. If `freeCapacity > 0`, harvest the deterministically assigned same-room source.
2. Else if `energy > 0` and a same-room energy structure is not full, refill it.
3. Else if `energy > 0` and a same-room construction site exists, build it.
4. Else if `energy > 0` and a same-room controller exists, upgrade it.
5. Else return no decision.

Stable target ordering:

- energy structures by `id`
- construction sites by `id`
- sources keep existing source-id ordering and creep-name assignment

## Mock Boundary

Unit tests use plain object snapshots only. Do not import Screeps globals or constants.

## Non-goals

- No runtime action execution.
- No extension placement.
- No builder role or mode flag.
- No repair/container/road/tower behavior.
