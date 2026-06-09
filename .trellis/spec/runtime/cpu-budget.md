# CPU and Performance Budget

## Screeps Constraint

CPU and bucket are first-class runtime constraints. Algorithm design must account for per-tick cost before broad strategy code is accepted.

## Required Before Complex Algorithms

For pathfinding, room scanning, body planning, market search, remote mining, or defense evaluation, document:

- Input size: creeps, rooms, sources, structures, routes, or market orders.
- Expected frequency: every tick, every N ticks, on state change, or on demand.
- Single-tick CPU budget.
- Bucket floor.
- Cache owner and invalidation rule, if caching is used.
- Behavior when CPU budget is low.
- Measurement method.

Runtime snapshots should capture the CPU fields needed by the behavior:

- `Game.cpu.limit`
- `Game.cpu.tickLimit`
- `Game.cpu.bucket`
- `Game.cpu.getUsed()`

`docs/game-state.md` currently records CPU limit `20`; bucket and tick limit are not yet observed.

## Tick Rules

- Do not scan all visible rooms every tick unless the task proves it is bounded.
- Do not run pathfinding for every creep every tick without caching or throttling.
- Use `PathFinder` `maxOps` for bounded searches when pathfinding enters production code.
- Market scans and global route searches must be throttled or event-driven.
- Cache rebuilds must state whether they are full rebuilds or incremental updates.
- Do not serialize large `Memory` objects for routine logs.
- Do not add unbounded per-tick logging.
- Do not introduce WASM until a measured TypeScript implementation is proven insufficient.

Default low-bucket rule format:

```text
When bucket < <floor>, skip <non-critical work> and preserve <critical work>.
```

## Tests Required

Performance-sensitive code should expose testable behavior without relying on wall-clock timing:

- Unit tests for throttling decisions.
- Unit tests for cache invalidation.
- Unit tests for low-CPU fallback decisions.
- Integration tests for call counts at the public boundary when a system collaborator is mocked.

## Comments

Complex performance logic should comment the invariant or budget rule, not the mechanical loop steps.

Good comment:

```typescript
// Recompute room terrain costs only when room ownership or construction sites change.
```

Bad comment:

```typescript
// Loop through every room.
```
