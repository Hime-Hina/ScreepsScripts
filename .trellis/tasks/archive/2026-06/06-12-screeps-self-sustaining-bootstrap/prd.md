# Restore Screeps self-sustaining bootstrap

## Goal

Respawn from empty account state, deploy minimal production AI that spawns and runs workers, and verify live readback.

## Confirmed Facts

- Account world status is `empty`; no owned or reserved rooms were returned by the live API.
- Former production room `shard3 / W15S27` has no spawn or creeps, and `place-spawn` rejects it as `room not available`.
- `shard3` has no current future `respawnArea` candidates in the scanned 0-120 coordinate range.
- Current usable non-special candidate selected for restart is `shard1 / W51N21`, spawn position `35,23`, two sources at path distances `22/23`, controller distance `20`, with the main drawback `20.6%` swamp.
- Current deployed code only records heartbeat and produces an initial spawn decision; it does not execute `spawnCreep` or run creep work.

## Requirements

- Place a new production spawn in a currently available respawn-area room.
- Allocate CPU to the shard that owns the new room before expecting live ticks to run.
- Implement the smallest production runtime that can:
  - spawn a first worker from the initial 300 energy,
  - keep worker population alive,
  - harvest energy,
  - refill spawn energy when needed,
  - upgrade the controller when spawn energy is stable.
- Keep Screeps global reads and direct actions inside the runtime boundary.
- Keep strategy behavior observable through focused tests and live API readback.
- Do not add compatibility paths for the removed 2021 role-based design.

## Acceptance Criteria

- [x] Live API readback shows the selected spawn exists in the selected room.
- [x] Live shard CPU allocation allows the selected shard to execute code.
- [x] `pnpm typecheck`, `pnpm lint`, `pnpm test:unit`, and `pnpm test:integration` pass.
- [x] `pnpm build` and `pnpm verify:live:screeps` pass after deployment.
- [x] The deployed runtime attempts initial worker spawn and runs worker harvest/refill/upgrade behavior without requiring manual per-creep commands.

## Notes

- Official docs used: respawn/start-area rules and `Game.cpu.setShardLimits`.
- External player-code references used for direction, not copied: Overmind separates colony orchestration from runtime operations; Screeps TypeScript starter validates the TypeScript/Rollup deployment shape.
