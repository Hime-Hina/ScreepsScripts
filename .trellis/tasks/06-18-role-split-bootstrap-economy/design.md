# Role-split container logistics for bootstrap/RCL3 economy design

## Dependency

This task depends on priority spawn requests and TTL replacement pressure. Role demand should produce typed requests, not bypass the request selector.

## Initial role model

- `emergencyWorker`: universal recovery, highest priority.
- `miner`: source-focused WORK body, assigned per source/container.
- `hauler`: CARRY/MOVE body, moves energy from source containers to spawn/extensions/controller/build sinks.
- `builder`: consumes available logistics when construction backlog exists.
- `upgrader`: consumes controller container or surplus energy.

## Runtime boundaries

- Runtime captures creep role/name/memory only through typed snapshots if needed.
- Pure planners choose role demands and actions.
- Runtime executes harvest/transfer/withdraw/build/upgrade as final side effects.

## Non-goals

- No full traffic manager.
- No remote mining.
- No storage/link logistics.
- No broad Memory migration unless a minimal role field is unavoidable and tested.
