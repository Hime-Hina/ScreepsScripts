# Priority bootstrap/RCL3 spawn requests PRD

## Goal

Promote early-economy spawn demand into explicit prioritized requests after the RCL3 unblock. This prepares the system for survival, development, TTL replacement, and role-specific requests without adding more hidden special cases.

## Current context

W51N21 is RCL3 with an idle spawn and stalled development. The immediate demand/energy/layout deadlock is handled by `06-20-rcl3-economy-unblock-accessible-layout`; this task starts after that fix is live or verified.

## Requirements

- Represent spawn needs as request records with type, priority, room, target gap, body catalog, and reason metrics.
- Preserve survival worker priority above development/replacement/role requests.
- Let development requests work for safe RCL2/RCL3 rooms.
- Keep final output as the existing single `SpawnDecision | null` until a later task needs multi-spawn coordination.
- Do not implement TTL replacement or role split here; only make them easy to add.

## Acceptance criteria

- Tests cover priority ordering, affordability, target gap, stable tie-breaking, and no-request cases.
- Existing survival and development behavior remains equivalent except for intentional RCL3 support from the P0 task.
- `pnpm check`, focused tests, and task validation pass.
