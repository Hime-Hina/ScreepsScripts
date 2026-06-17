# Design: RCL2 worker body scaling

## Current behavior

`src/spawning/spawn-decision.ts` has two early worker bodies:

```ts
const INITIAL_WORKER_BODY = ['work', 'carry', 'move'];
const EARLY_WORKER_BODIES = [
  ['work', 'carry', 'carry', 'move', 'move'],
  INITIAL_WORKER_BODY,
];
```

`selectEarlyWorkerBody` chooses the first body whose cost is no greater than both spawn available energy and energy capacity. With 550 total RCL2 capacity, it still chooses the 300-energy body because no larger body tier exists.

## Target behavior

Add one or more deterministic RCL2 worker body tiers above 300 energy while preserving the emergency low-energy body.

Preferred minimal tier to evaluate first:

```text
[WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE]
```

Cost with official constants: `2*100 + 3*50 + 4*50 = 550`.

Rationale:

- doubles WORK throughput vs current 300 body;
- increases CARRY from 100 to 150 capacity;
- keeps 4 MOVE for 5 non-MOVE parts, limiting plain-terrain slowdown better than lower-MOVE 550 alternatives;
- remains a generic worker body, avoiding role split complexity.

If tests or source analysis show this tier is not appropriate, the agent may choose a smaller 450/500 tier, but must document the reason in its final handoff.

## Boundaries

Do not change worker demand targets here; that belongs to `06-17-rcl2-development-worker-demand`. Do not introduce role-specific harvest/haul/upgrade logic. Do not add roads/containers or live operations.

## Relevant files

- `src/spawning/spawn-decision.ts` — body tiers and selection.
- `test/unit/spawning/spawn-decision.test.ts` — body selection coverage.
- `src/runtime/screeps-runtime.ts` — passes Screeps body constants/costs into spawning snapshots; inspect only if needed.

## Compatibility notes

- `planBootstrapSurvivalWorkerSpawn` and `planBootstrapWorkerSpawn` both call the same body selector. Keep emergency spawning possible with 200 energy.
- Tests should use captured body part costs, not hard-coded cost math inside production code.
- Preserve deterministic body ordering: most expensive/preferred viable body first, emergency fallback last.
