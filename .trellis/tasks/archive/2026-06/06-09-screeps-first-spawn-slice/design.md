# 实现第一个 spawn 行为切片 Design

## Boundaries

- `src/spawning/` is created only for this accepted spawning behavior.
- Runtime boundary exposes a narrow spawn snapshot or action request boundary; domain code does not read raw `Game.spawns`.
- Kernel orchestrates one tick and returns telemetry plus the observable decision.
- Memory boundary supplies typed persistent state if the decision needs persisted names or counters.

## Initial Slice

```text
Given an owned spawn exists and there are no creeps
When one tick runs
Then the system produces one spawn decision for an initial worker
And the decision is observable through returned state, log, or action request
```

## Data Flow

```text
runtime snapshot + memory state -> kernel -> spawning decision -> runtime action request/log
```

## Constraints

- No complete economy loop.
- No role folder architecture.
- No mode flag to switch dry-run versus live execution; if execution is separate from planning, expose separate operations.
- Body/name policy is intentionally minimal and documented by the behavior test.

## Documentation Impact

- `docs/architecture.md` should list the first implemented spawning boundary if `src/spawning/` is introduced.
