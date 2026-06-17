# Role-split bootstrap economy design

## Direction

Build on priority spawn requests:

```text
survivalUniversalWorker
minerRecovery
haulerRecovery
builderBurst
upgraderMaintenance
```

Each demand source returns `SpawnRequest` entries; the existing final executor still spawns one creep per available spawn/tick until multi-spawn batch execution is intentionally added.

## Dependencies

- Depends on adaptive demand, priority request model, and TTL replacement pressure.

## Non-goals

- No full Overmind-style overlord hierarchy.
- No remote mining expansion in this task.
