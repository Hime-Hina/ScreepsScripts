# RCL4 storage and extension planning design

## Construction planner changes

- Extend `ConstructionStructureType` to include `storage`.
- Add storage limit/capability snapshot from Screeps constants at the runtime boundary.
- Plan order at RCL4:
  1. missing extensions with access guard;
  2. first tower if missing and allowed;
  3. storage if allowed and absent;
  4. logistics containers/roads as current planner does.

The exact order may be adjusted by tests if storage should precede additional roads, but construction site volume must remain bounded.

## Access invariants

- Every owned refill target and planned refill target must retain at least one adjacent walkable tile unless it is an existing legacy inaccessible target unrelated to the candidate.
- Candidate checks are cumulative within the same tick.
- Roads/ramparts remain walkable; non-road owned core structures block.
