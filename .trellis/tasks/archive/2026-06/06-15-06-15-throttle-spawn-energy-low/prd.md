# Throttle spawn-energy-low Game.notify noise

## Goal

Stop `spawn-energy-low` from sending `Game.notify` emails for normal transient spawn/extension refill cycles when the live room is otherwise healthy.

## Requirements

- Keep critical `Game.notify` alerts for controller downgrade, low worker count, hostiles, and runtime action failures.
- Do not notify `spawn-energy-low` only because total spawn/extension energy is below capacity during healthy RCL2 refill/build cycles.
- Preserve `spawn-energy-low` only when the low-energy state is paired with an existing survival risk visible in the same snapshot, such as low worker count or imminent controller downgrade.
- Keep the change in the pure kernel alert selector; do not add persistent memory, live console writes, or deployment side effects.
- Reference GitHub issue #8 in the resulting PR.

## Acceptance Criteria

- [x] A regression test proves a healthy room with workers above the survival floor and safe downgrade timer does not emit `spawn-energy-low` when energy is below capacity.
- [x] Existing survival-risk alerts still emit, and a low-energy room with low worker count still emits `spawn-energy-low` as supporting context.
- [x] Focused runtime alert tests pass.
- [x] `pnpm check` passes before opening/updating the PR.

## Notes

- Current live readback before coding: `shard1 / W51N21` is `status=normal`, `workerCount=5`, `spawnEnergy=300/300`, no hostiles, `recoveryStates=W51N21:roomHealthy`, heartbeat verified, CPU bucket `10000`.
- This is a warning/actionable alert-noise fix, not an emergency deployment.
