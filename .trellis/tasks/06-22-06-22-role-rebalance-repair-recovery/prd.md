# Fix role rebalance and bootstrap repair recovery

## Live evidence

Read-only W51N21 snapshot after `bbb40b16` deploy showed:

- 18 visible creeps: 17 `miner`, 1 `hauler`, 0 `builder`, 0 `upgrader`, 0 generic worker.
- Spawn was continuing to spawn `Spawn1-miner-*`.
- Both source-local containers were full at 2000 energy.
- `45/45` roads were below 35% hits; many were near 4–6%.
- Storage construction existed, but no builder/upgrader/worker role was available to build or repair.

## Requirements

- Stop replacing surplus role creeps when the role remains above target after current expiring creeps age out.
- Recover missing builder/upgrader role targets even when total population is above the generic worker target because of surplus miners.
- Keep the previous bounded hauler logistics recovery behavior.
- Preserve existing survival/development worker fallback and role-specific bodies.
- Add regression tests for live-like miner-heavy drift and surplus replacement suppression.
- No manual Screeps Memory role rewrite is part of this task unless separately authorized.

## Acceptance Criteria

- [x] A live-like regression with many miners, one hauler, no builders/upgraders, full source containers, storage construction, low road hits, and an expiring miner requests `builderWorker` before any miner replacement.
- [x] An over-target room with surplus expiring miners and no missing role targets does not request another miner replacement.
- [x] A role at target with an expiring member still gets replacement if the post-expiry count would fall below target.
- [x] Existing hauler recovery and healthy no-growth tests remain green.
- [x] Focused spawning tests pass.
- [x] `pnpm check`, `git diff --check`, and task validation pass before deploy.
