# Fix PTR deploy rollback snapshot output

## Goal

Restore cross-platform `pnpm check` by making the PTR deploy rollback snapshot log assertion deterministic on Linux and Windows.

## Requirements

- The PTR deploy command must continue snapshotting the previous PTR modules before uploading local code.
- The log assertion must not depend on host OS path separators.
- The fix must not expose tokens or module source in logs.
- The fix must be minimal and limited to the failing PTR deployment test/output contract.

## Acceptance Criteria

- [ ] `pnpm vitest run test/integration/screeps-deployment/ptr-commands.test.ts -t "snapshots current PTR modules before uploading local main and verifying readback" --reporter=verbose` passes.
- [ ] `pnpm test:coverage` passes.
- [ ] `pnpm check` passes or any remaining failure is unrelated and documented.

## Notes

- Observed on Bob/Linux: test expected `rollbackSnapshot=.screeps\\ptr\\latest.json`, while runtime output uses POSIX separators from `PTR_ROLLBACK_SNAPSHOT_PATH`.
