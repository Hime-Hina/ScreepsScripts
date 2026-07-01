# Suppress false critical alerts for non-owned rooms

## Goal

Filter W51N20-style non-owned/no-controller room false positives from runtime critical alert selection while preserving real owned-room survival emergencies.

## Problem evidence

- PM2 bridge repeatedly emitted `controller_downgrade_critical` and `worker_count_low` for `shard1/W51N20`.
- Read-only API/scout checks showed W51N20 is not in `ownedRooms`, has no controller/source/spawn/owned creep, and is not present in the structured heartbeat.
- Current owned room W51N21 is healthy; alerts are noise from visible non-owned room snapshots.

## Requirements

- Runtime survival alerts must not emit `controller_downgrade_critical`, `worker_count_low`, `spawn_energy_low`, or role-composition drift for rooms explicitly marked `isOwned: false`.
- Existing behavior must remain unchanged for legacy/test snapshots where `isOwned` is absent.
- Existing owned-room critical alerts must remain intact for controller downgrade critical, zero workers, and unrecoverable worker dips.
- Keep the fix in `runtime-alerts` / alert-selection logic; do not change spawn strategy or live game state.

## Acceptance Criteria

- [ ] A regression test reproduces W51N20-like visible non-owned/no-controller room noise and fails before the fix.
- [ ] The regression passes after the fix.
- [ ] Existing runtime alert tests still pass.
- [ ] `pnpm check` and `git diff --check` pass.
- [ ] No deploy, rollback, PM2 restart, Memory write, or console write is performed without separate authorization.
