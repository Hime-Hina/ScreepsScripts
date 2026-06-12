# Restore Screeps Self-Sustaining Bootstrap Design

## Boundaries

- `src/runtime/` owns direct Screeps globals and executes selected game actions.
- `src/kernel/` keeps tick orchestration and returns observable execution data.
- `src/spawning/` owns spawn decisions.
- A new creep work slice may define worker decisions over explicit snapshots, but it must not read `Game` directly.

## Data Flow

1. Runtime captures spawn, creep, source, and controller snapshots from `Game`.
2. Kernel requests spawn and worker decisions from strategy modules.
3. Runtime executes the complete action requests against Screeps objects.
4. Memory boundary remains the single project memory root writer.

## Production Strategy

- Spawn a compact worker body from 200 energy while the room has no creeps.
- Maintain a small worker population once the initial worker exists.
- Worker action priority:
  1. harvest when empty,
  2. refill spawn when carrying energy and spawn is below capacity,
  3. upgrade controller when carrying energy and spawn is stable.
- Use existing Screeps movement primitives (`moveTo`) for the first production loop. Path caching and construction planning are out of scope for this emergency slice.

## Operations

- Selected restart target: `shard1 / W51N21`, spawn `Spawn1` at `35,23`.
- CPU moved from `shard3` to `shard1` through `/api/user/cpu-shards`; console `Game.cpu.setShardLimits` was not usable while the account had no ticking room.
- Rollback path remains `pnpm rollback:screeps`, but the previous deployed code is not self-sustaining and is not a useful production state.
