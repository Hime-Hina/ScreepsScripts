# Design: Construction site throttling and phased logistics build

## Current behavior

`planOwnedRoomConstruction` returns all missing extension decisions, otherwise all early logistics container decisions plus every road tile along paths to source/controller anchors.

This creates correct sites but can produce a large road backlog in one tick.

## Proposed behavior

Keep candidate generation pure, then apply phase/priority throttling:

1. Extension decisions remain first and can fill up to the RCL extension deficit.
2. Future RCL3 tower decisions should be higher priority than roads.
3. Container decisions are high-priority logistics anchors.
4. Road decisions are lower-priority and should be capped when active site count is high.

Suggested constants to validate in tests, not necessarily final names:

```ts
const MAX_NEW_ROAD_SITES_PER_ROOM = 5;
const MAX_ACTIVE_ROAD_SITE_BACKLOG_PER_ROOM = 10;
```

Keep these local to `src/construction/construction-planner.ts` unless later tasks need configuration.

## Compatibility

- Existing live rooms with many sites are not mutated.
- Existing tests for exact extension positions should remain unchanged.
- Road path selection stays deterministic; throttling should take the first N deterministic road decisions.

## CPU and safety

- Throttling is O(number of candidate decisions/sites), cheaper than pathfinding.
- No Memory writes.
- No extra runtime scanning beyond existing construction snapshot.

## Files

- `src/construction/construction-planner.ts`
- `test/unit/construction/construction-planner.test.ts`
- `test/integration/main-loop.test.ts` if runtime-visible behavior changes.
