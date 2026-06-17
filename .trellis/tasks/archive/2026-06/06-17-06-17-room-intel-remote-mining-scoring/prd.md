# Room intel and remote mining candidate scoring

## Problem

Mature Screeps bots do not choose remotes by ad hoc flags alone; they maintain room intel and score neighboring rooms before reserving/harvesting. The local repo already has deployment/scout utilities, but runtime strategy does not yet have a deterministic room-intel model for future remote mining.

Evidence:

- Overmind has `src/intel/RoomIntel.ts`, outpost directives, and remote debugging.
- TooAngel has `brain_nextroom`, routing, external room modules, and remote harvesting.
- The International has `RemotePlanner`, `RemotesManager`, `Scout`, and remote role classes.
- ScreepsQuorum has room intel/territory/economy modules.

## Goal

Add a read-only, pure room-intel scoring module that can evaluate visible/scouted room snapshots and rank remote mining candidates for future tasks.

## Requirements

- Keep runtime mutation out of scope.
- Use snapshots only; no direct `Game` access outside runtime/scout boundary.
- Score room candidates by source count, distance/route estimate when available, ownership/reservation, hostile risk, and keeper-room exclusion.
- Include explicit unknown-data behavior.
- Do not spawn remote creeps or reserve controllers in this task.

## Acceptance criteria

- Unit tests cover owned room exclusion, hostile/keeper penalty, source-count scoring, distance tie-break, and deterministic ordering.
- If runtime capture is added, integration tests stub only the boundary.
- Research note records exact external files studied and which concepts were adopted/rejected.
- `pnpm check` and `git diff --check` pass.

## Non-goals

- Remote mining execution.
- Claimer/reserver/hauler spawning.
- Observer automation.
- Live Memory writes.
