# RCL3 tower and extension planner slice

## Problem

The room is progressing through RCL2. Mature bots prepare structure planning ahead of controller milestones: tower placement/activation and additional extensions are early RCL3 priorities.

Evidence:

- TooAngel lists automatic base building and defense modules.
- Overmind has bunker/room planner assets and defense directives.
- The International has `TowerManager` and `CommunePlanner`/construction planners.

Local constraint: add a conservative planner slice only; do not build a full bunker planner.

## Goal

Extend the pure construction planner so RCL3 rooms can plan the first tower and additional RCL3 extensions without disrupting existing RCL2 behavior.

## Requirements

- Add `tower` as a construction structure type only if needed for decisions.
- Capture official tower controller limits from runtime, analogous to extensions.
- Prefer deterministic tower placement near spawn/controller core and skip blocked/wall/occupied tiles.
- Preserve extension, container, and road behavior.
- Do not add tower runtime attack/heal/repair behavior in this task unless tests show a minimal safe slice is trivial.

## Acceptance criteria

- Unit test proves RCL3 room with no tower emits one tower site candidate.
- Unit test proves existing tower structure/site satisfies the tower limit.
- Unit test proves RCL3 extension limit is respected using captured limits.
- Existing RCL2 construction tests pass.
- Runtime integration test proves tower decisions call `room.createConstructionSite(..., STRUCTURE_TOWER)` if wired.
- `pnpm check` and `git diff --check` pass.

## Non-goals

- Rampart/wall planning.
- Tower combat policy.
- Bunker/base planner.
- Live deploy/restart unless separately authorized.
