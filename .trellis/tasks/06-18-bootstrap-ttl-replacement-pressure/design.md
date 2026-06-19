# Bootstrap/RCL3 TTL replacement pressure design

## Dependency

This task depends on explicit spawn requests from `06-18-priority-bootstrap-spawn-requests`. Replacement pressure should be represented as a request gap input, not as a separate ad-hoc spawn branch.

## Policy

- Add a replacement TTL window for worker-like creeps.
- Treat a worker below the window as partially or fully missing for target-gap calculation.
- Count currently spawning replacement creeps against the gap when the runtime snapshot exposes that information.
- Keep emergency survival worker requests highest priority.

## Boundaries

- No role split in this task.
- No Memory schema migration unless required for stable role/type identification; prefer current naming/snapshot data when possible.
- No live deployment without separate deploy approval.
