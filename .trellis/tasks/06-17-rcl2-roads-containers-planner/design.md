# Design: RCL2 roads and containers planner

## Current behavior

`src/construction/construction-planner.ts` currently only plans RCL extension construction sites around the spawn. The construction snapshot includes:

- room name;
- controller level;
- spawn position;
- existing structures;
- construction sites;
- blocked positions;
- terrain.

It does not yet include source positions or controller position, so it cannot plan source/controller containers or roads without extending the snapshot contract.

## Target behavior

Add a conservative pure planner for early logistics sites from deterministic snapshots. It should select candidate positions for:

- source-adjacent containers;
- a controller-adjacent container/staging tile;
- minimal roads between spawn/extension cluster, source container candidates, and controller candidate.

Keep the first slice small and testable. It is acceptable to implement only planning decisions and not live site creation if that keeps the behavior safe and independently verifiable.

## Suggested data model direction

Extend construction snapshots with minimal fields, for example:

```ts
interface ConstructionSourceSnapshot extends ConstructionPositionSnapshot {
  readonly id: string;
}

interface ConstructionControllerSnapshot extends ConstructionPositionSnapshot {}

interface ConstructionOwnedRoomSnapshot {
  readonly controllerPosition?: ConstructionPositionSnapshot;
  readonly sources?: readonly ConstructionSourceSnapshot[];
  // existing fields unchanged
}
```

Prefer optional fields only if needed to preserve existing tests during incremental migration. If required fields are cleaner, update all construction snapshot creation sites and tests in the same slice.

## Candidate selection rules

- Candidate container tiles must be room-interior, non-wall, not occupied by existing structures/sites, and adjacent to the source/controller target.
- Prefer deterministic ordering so tests are stable: sort by range to spawn, then y, then x, unless another documented ordering is simpler.
- Road candidates should avoid walls, existing structures that cannot share a road, and existing construction sites. Existing roads should count as already satisfied.
- Do not overwrite spawn/extensions.

## Boundaries

- Do not add tower/rampart/wall/base-bunker planning.
- Do not add dedicated roles.
- Do not perform live `createConstructionSite` operations without separate deploy/live authorization.
- Keep extension planning behavior unchanged unless required by the shared construction decision type.

## Relevant files

- `src/construction/construction-planner.ts` — current planner and snapshot contracts.
- `test/unit/construction/construction-planner.test.ts` — primary tests.
- `src/runtime/screeps-runtime.ts` — construction world snapshot extraction and live `createConstructionSite` execution path; inspect before wiring decisions into runtime.
- `docs/game-state.md` — current observed room anchors may be updated separately if project convention requires.

## Live anchors from planning evidence

- room: `shard1/W51N21`
- spawn: `35,23`
- controller: `26,7`
- north source: `28,5`
- south source: `19,43`
- mineral: `42,26` (`H`), out of scope
- existing structures: 1 spawn, 5 extensions, no roads/containers/towers
