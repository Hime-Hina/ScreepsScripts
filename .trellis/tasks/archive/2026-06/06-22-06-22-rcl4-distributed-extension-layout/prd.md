# RCL4 distributed extension layout migration

## Problem

The RCL4 core in `W51N21` still has too many extensions clustered in the spawn ring. The previous refill-access fix prevents single-tile refill traps, but it can still create compact extension rows near the spawn and existing roads. That keeps refill targets technically reachable while making traffic around `Spawn1` narrow and fragile.

Current live evidence after the P1 fix:

- room: `W51N21`, controller level 4, `status=normal`, no hostiles;
- deployed module hash: `3818e948d933bb60697868eb3b7d190bda73b4a60404e6ab16f7be3ebf1099c2`;
- refill access: `min=2 low=0/23`, so the immediate storage/extension trap is fixed;
- construction sites are still dense around the top/east side of the core, e.g. `extension@33,20`, `34,20`, `35,20`, `37,20`, `38,20`, `38,21`, `35,22`, `36,22`.

The user explicitly requested that extension positions be redesigned and that old dense placements be removed gradually rather than leaving everything piled around the spawn.

## Goals

1. Future RCL4 extension sites should be distributed away from the immediate spawn ring.
2. New extension candidates should preserve at least two refill-adjacent access tiles.
3. Extension candidates should avoid orthogonally adjacent clumps where practical, using a checkerboard/distributed pattern rather than contiguous rows.
4. The migration should be gradual:
   - first remove low-progress/bad construction sites;
   - let the planner recreate replacements in distributed locations;
   - do not mass-destroy built extensions unless replacements are already available and the room remains safe.
5. RCL2/RCL3 behavior must not regress.

## Non-goals

- Do not implement a full bunker/base-layout solver.
- Do not delete roads/containers.
- Do not change builder/upgrader/miner role logic in this task unless a direct layout test requires it. The later role/source observations are acceptable to ignore for this slice if current behavior is expected.
- Do not broad-clear Screeps Memory.

## Acceptance criteria

- Unit tests prove RCL4 extension planning skips the dense radius-2 spawn ring and chooses distributed/checkerboard candidates.
- Unit tests prove RCL2/RCL3 near-spawn behavior remains compatible with bootstrap constraints.
- Full `pnpm check`, `git diff --check`, and Trellis validation pass.
- Live migration removes only known bad low-progress extension sites and verifies the planner recreates replacements at distributed positions.
- Post-deploy/readback remains `status=normal`, `naturalTickHeartbeat=verified`, no hostiles, and `refillAccess` remains `min>=2`.