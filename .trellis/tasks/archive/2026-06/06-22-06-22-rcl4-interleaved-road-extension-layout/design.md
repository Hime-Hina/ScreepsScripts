# Design: RCL4 interleaved road/extension layout

## Current behavior

RCL4+ extensions are filtered outside the near-spawn radius and checkerboard-sorted. This prevents direct orthogonal extension adjacency, but the search still prefers a compact shell around the spawn/storage core.

## Proposed behavior

For RCL4+ only:

1. Treat existing/planned roads as the movement lattice.
2. Prefer extension candidates orthogonally adjacent to one or more road tiles.
3. When the active construction backlog is below the existing road throttle, emit a bounded number of interleaved road sites next to the new extension sites.
4. Return extension sites before road sites so capacity construction is not delayed if Screeps rejects later sites near a cap.
5. Penalize extension candidates adjacent to refill targets such as spawn/storage/tower/extension so the core keeps breathing room.
6. Keep existing safeguards:
   - buildable terrain only;
   - unavailable positions skipped;
   - no orthogonal adjacency to existing/planned extensions;
   - refill access preservation.

This keeps the change local to candidate scoring rather than adding a full base planner.

## Compatibility

- RCL2/RCL3 behavior is unchanged.
- Road planning remains owned by early logistics for long source/controller routes. RCL4+ extension planning may add only a bounded local interleaving road slice, and only under the same active-site road throttle.
