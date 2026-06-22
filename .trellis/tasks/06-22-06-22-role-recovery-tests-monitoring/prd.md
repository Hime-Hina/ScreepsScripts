# Add role recovery tests and monitoring

## Context

The W51N21 incident was a role-composition drift where surplus miners kept being replaced while builder/upgrader roles were absent. The code fix restored bounded role recovery, but follow-up coverage and monitoring should make recurrence easier to catch.

## Requirements

- Add regression tests for the second recovery phase: after builders recover, missing upgraders must be requested before surplus miner replacement.
- Add runtime alert coverage for role-composition drift using in-game `SpawningWorldSnapshot.workerCreeps` role data.
- Keep role-composition drift monitoring deterministic and bounded; it should be an actionable structured ops event only when role-specific creeps already exist, miners are materially surplus, and a required hauler/builder/upgrader role is missing.
- Add a read-only live monitor command that reports decoded `Memory.creeps` role counts, current spawn role, construction progress, source-container energy, and road repair backlog.
- Do not write Screeps Memory or console commands as part of this task.

## Acceptance Criteria

- [x] Spawning regression: a room with builders recovered but missing upgrader requests `upgraderWorker`, not surplus `minerWorker`.
- [x] Runtime alert regression: miner-heavy room with missing builder/upgrader emits `role_composition_drift` actionable event with role metrics.
- [x] Runtime alert regression: healthy/generic-only rooms do not emit role drift noise.
- [x] API helper test covers `/api/user/memory?path=creeps&shard=...` including `gz:` decode.
- [x] Live monitor integration test proves role counts, spawning role, road critical count/min hits, source container energy, and construction progress are printed without leaking token material.
- [x] Focused tests, `pnpm check`, `git diff --check`, and Trellis validation pass.
