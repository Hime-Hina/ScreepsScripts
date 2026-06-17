# Bootstrap TTL replacement pressure design

## Direction

After `SpawnRequest` exists, compute target gap as:

```text
gap = max(targetWorkerCount - liveWorkerCount, 0) + nearExpiryWorkerCount
```

Use different windows for survival and development if needed. The first implementation should keep constants explicit and test-visible.

## Dependencies

- Depends on `06-18-priority-bootstrap-spawn-requests` for request reason metrics and target-gap plumbing.
