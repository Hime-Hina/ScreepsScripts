# RCL2 extension planner decisions design

## Scope

This child owns pure construction planning only.

Write ownership:

- `src/construction/`
- `test/unit/construction/`

Do not edit:

- `src/runtime/screeps-runtime.ts`
- `src/kernel/run-tick.ts`
- worker decision files
- integration/e2e tests
- docs

## Public Interface

```typescript
planRoomConstruction(constructionWorld: ConstructionWorldSnapshot): readonly ConstructionDecision[]
```

Expected first decision:

```typescript
interface CreateConstructionSiteDecision {
  readonly roomName: string;
  readonly structureType: 'extension';
  readonly type: 'createConstructionSite';
  readonly x: number;
  readonly y: number;
}
```

Snapshot should include only pure data:

- owned room name
- controller level
- spawn position
- existing structures with type and position
- existing construction sites with type and position
- blocked positions: sources/controllers/minerals or other room objects that should not be overwritten
- terrain for candidate positions, with wall detection

## Planning Contract

- RCL1: no extension decisions.
- RCL2: target 5 total extensions, counting both built extensions and extension construction sites.
- If current count is already 5 or more, no decisions.
- Candidate order must be deterministic.
- Candidate positions are near spawn, but must not be the spawn tile.
- Reject wall tiles and occupied/blocked tiles.
- Emit at most the missing count.

## Algorithm Boundary

Use a small deterministic candidate set around the spawn. Do not implement distance transform, floodfill, min-cut, pathfinding, or full layout search in this child.

## Mock Boundary

Unit tests use plain object snapshots. Do not import Screeps globals.

## Non-goals

- No runtime `Room.createConstructionSite`.
- No road/container/rampart/tower planning.
- No live API calls.
