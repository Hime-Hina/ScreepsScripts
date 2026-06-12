# Restore Screeps Self-Sustaining Bootstrap Implementation

## Checklist

- [x] Start the Trellis task.
- [x] Read runtime, testing, and shared guide details before editing.
- [x] Add focused tests for action execution and worker behavior.
- [x] Implement runtime action execution for spawning.
- [x] Implement minimal worker harvest/refill/upgrade behavior.
- [x] Update integration and bundle tests for the new globals/actions.
- [x] Run focused tests, then local gates.
- [x] Build and deploy to live.
- [x] Place spawn in `shard1 / W51N21` if not already placed.
- [x] Move shard CPU to `shard1`.
- [x] Verify live API readback and record current game state.

## Validation

- `pnpm test:unit`
- `pnpm test:integration`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`
- `pnpm verify:live:screeps`

## Live Result

- Spawn placed: `shard1 / W51N21`, `Spawn1` at `35,23`.
- CPU shard account config: `shard1 = 20`.
- Live code hash: `87534439e365323bb9d223627cb1b21593b75384d36604cdbdd469737a152df8`.
- Self-sustaining evidence: first worker harvested, refilled spawn, and started a second worker; two workers were running on final readback.

## Rollback Points

- Before live deploy: no live code has changed.
- After deploy before spawn placement: `pnpm rollback:screeps` can restore prior remote modules.
- After spawn placement: rollback should not remove the need for self-sustaining production code.
