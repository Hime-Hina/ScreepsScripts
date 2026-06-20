# RCL3/RCL4 safe development train PRD

## Goal

Safely advance `shard1 / W51N21` from the current healthy RCL3 state into stable RCL4 development without introducing production regressions. The train covers one bounded live cleanup, active role logistics, and RCL4 construction readiness.

## Grounded live state at planning time

Read-only `pnpm status:live:screeps` and room-object evidence on 2026-06-21:

- Branch: `main`; live module hash: `6ada0cd2226dc99e3849c127c687e51dcf7e61b8daa8b53fc4053348fb1f2e05`.
- Room: `shard1 / W51N21`, status `normal`, recovery `W51N21:roomHealthy`.
- Controller: RCL3, progress around `106864+`, downgrade timer healthy, safe mode available from prior readback.
- CPU: heartbeat verified, bucket `10000`, budget `full`, CPU per tick around `0.15`.
- Structures: 1 spawn, 10 extensions, 1 tower, 3 containers, 45 roads, 0 construction sites.
- Energy: heartbeat `750/800`; one existing extension at `35,22` is completely inaccessible and empty.
- Hostiles: 0 hostile creeps/spawns/towers.

## Product requirements

1. Fix the known live layout blocker without broad manual structure manipulation.
2. Implement active role behavior only in bounded, testable slices.
3. Preserve the proven survival and recovery boundaries:
   - survival worker floor;
   - critical/warning controller downgrade upgrade behavior;
   - defense deferral/safe-mode behavior;
   - CPU survival-only mode;
   - deploy rollback snapshot path.
4. Prepare RCL4 construction so the room does not stall after level-up.
5. Keep all changes snapshot-driven and domain-boundary compliant.
6. Do not introduce a broad base planner, full traffic manager, or remote expansion in this train.

## Child tasks and dependency order

1. `06-21-06-21-unblock-inaccessible-extension-live-cleanup` — ops/live cleanup.
2. `06-21-06-21-active-hauler-logistics` — first code behavior slice.
3. `06-21-06-21-controller-container-upgrader-flow` — second code behavior slice.
4. `06-21-06-21-rcl4-storage-extension-planning` — RCL4 construction readiness.

## Acceptance criteria for the train

- Every child task has PRD/design/implementation/check context before implementation begins.
- Each code task follows RED/GREEN with focused tests, then `pnpm check`, `git diff --check`, task validation, independent review where available, deploy, PM2 bridge restart, live readback, and short monitoring.
- The live cleanup task re-verifies the target immediately before the write and destroys only the inaccessible `extension@35,22`.
- At the end of the train, `W51N21` remains `normal`, `roomHealthy`, no hostiles, heartbeat verified, CPU bucket healthy, and the deployed module hash matches the checked code.

## Non-goals

- No remote mining or claiming.
- No attack/market/terminal behavior.
- No manual mass construction.
- No manual Memory migration unless a later task proves it is required and tests cover the code path.
