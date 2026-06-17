# Priority bootstrap spawn requests design

## Direction

Introduce a pure request planning API:

```ts
planBootstrapSpawnRequests(world): readonly SpawnRequest[]
selectExecutableSpawnDecision(requests, world): SpawnDecision | null
```

`SpawnRequest` should carry enough metadata for future TTL replacement and role split without changing runtime execution.

## Dependencies

Depends on `06-18-adaptive-bootstrap-worker-demand` because dynamic target/gap is the first request driver.

## Non-goals

- No multi-spawn batch execution yet.
- No role split yet.
- No live deployment in this task.
