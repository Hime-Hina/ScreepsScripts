# Design

## Planner changes

Keep the existing heuristic construction planner, but specialize RCL4+ extension candidate ordering:

- RCL1-RCL3 extensions keep the bootstrap near-spawn candidate behavior.
- RCL4+ extension planning uses a distributed candidate list:
  - minimum Chebyshev range from spawn: `3`;
  - maximum search radius: `8`;
  - prefer checkerboard parity so orthogonally adjacent extension clumps are avoided;
  - preserve the existing `preservesRefillAccess` invariant with minimum refill access of `2`.

This is intentionally narrower than a full layout solver. It addresses the observed traffic choke point while keeping the existing planner structure and tests intact.

## Migration behavior

The planner only creates construction sites. Live removal is handled as an explicit operational step:

1. Deploy the planner change.
2. Remove low-progress/bad extension sites that were created by the previous dense planner, starting with sites that create or reinforce tight spawn-ring rows.
3. Wait one or more ticks for the updated planner to create replacements.
4. Verify replacement sites are outside the radius-2 spawn ring and `refillAccess` remains at least `2`.
5. Do not remove built extensions in bulk. Built-extension cleanup can be a later one-at-a-time operation after replacements complete.

## Later observations

The user's builder/source observations are treated as diagnostic notes for this task:

- `builder` may fall back to `upgradeController` only after primary refill, downgrade guard, critical repair, and construction target selection fail. That fallback is currently expected by code shape.
- Source assignment is round-robin by sorted role priority/name across visible sources. If live evidence later proves source starvation persists after layout traffic is improved, create a separate task for source-slot reservations or miner assignment balancing.

This task does not change those behaviors unless a regression test directly exposes them as blockers for extension migration.