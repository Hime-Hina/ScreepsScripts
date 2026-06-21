# Role composition safety and body specialization

## Goal

Prevent RCL3+ role-split rooms from stalling when role composition drifts away from logistics coverage, and make newly spawned specialized creeps use role-appropriate body catalogs instead of all roles sharing the generic worker bodies.

## Requirements

- If a room has source-container logistics available and spawn/extensions or controller-side logistics need energy, the spawning policy must keep at least one hauler-equivalent logistics role visible even when total creep population is at or above the generic target.
- Missing target roles must be filled before replacing surplus/expiring roles, so an overrepresented miner/upgrader set cannot starve a missing hauler.
- Hauler recovery must remain bounded: do not grow role-split creeps above target unless there is a concrete logistics deficit such as source-container backlog plus primary/core energy deficit.
- Specialized spawn requests must use role-specific body catalogs while preserving the existing survival/development worker fallback behavior.
- The implementation must remain within existing domain boundaries: spawning decides role/body requests; creep action planning continues to execute per-creep behavior; runtime remains the Screeps global capture/execution boundary.
- No live deploy, PM2 restart, Screeps Memory write, or console write is part of this task unless separately authorized.

## Acceptance Criteria

- [x] A regression test covers the live-like failure mode: miners/upgraders exist, hauler count is zero, source containers are backlogged, spawn/extensions are underfilled, and the spawn policy requests `haulerWorker` before miner/upgrader replacement.
- [x] Existing healthy above-target RCL3 rooms with no logistics deficit still produce no extra role-split growth.
- [x] Missing hauler requests are prioritized before replacement of expiring surplus roles.
- [x] Miner and hauler spawn decisions use role-specific bodies; generic survival/development worker bodies keep their current fallback order.
- [x] Focused spawning tests pass.
- [x] `pnpm check`, `git diff --check`, and `task.py validate 06-21-role-composition-safety` pass before commit.
