# Priority bootstrap/RCL3 spawn requests design

## Request shape

A spawn request should carry enough data for deterministic selection:

- `requestType`: survival, development, later replacement/role types.
- `priority`: numeric ordering; survival remains highest.
- `targetGap`: how many creeps/bodies are missing.
- `bodyOptions`: body catalog in descending capability order.
- `roomName`, `spawnName`, and reason metrics for tests/diagnostics.

## Selection

Selection still returns one spawn decision:

1. Build all requests from room snapshots.
2. Drop requests whose target gap is zero.
3. For each idle spawn, choose the highest-priority affordable request.
4. Break ties deterministically by priority, request type, target gap, spawn order, and room/name.

## Boundaries

- Do not split roles yet.
- Do not count near-expiring workers yet.
- Do not change runtime execution beyond any typed request fields needed by tests.
