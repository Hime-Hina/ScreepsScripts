# Design: RCL3 tower and extension planner slice

## Current behavior

`ConstructionWorldSnapshot.controllerStructureLimits` only includes extension limits. The planner can create extensions, containers, and roads. Runtime execution is generic over `structureType`, but type union does not include `tower`.

## Proposed behavior

- Extend construction limits with `tower` from `CONTROLLER_STRUCTURES[STRUCTURE_TOWER]`.
- Extend `ConstructionStructureType` with `'tower'`.
- Add tower planning before lower-priority logistics roads.
- Reuse deterministic near-spawn candidate selection or a documented small candidate set.

Suggested order:

1. Missing extensions for current RCL.
2. Missing tower for RCL >= 3.
3. Containers.
4. Roads with throttling if that task has landed.

## Compatibility

- RCL1/RCL2 tower limit is zero, so no behavior change before RCL3.
- Existing live site execution already uses `room.createConstructionSite(x, y, structureType)`.

## Runtime constants

Update test bundle constants if `STRUCTURE_TOWER` or `CONTROLLER_STRUCTURES[STRUCTURE_TOWER]` is newly read by compiled runtime.
