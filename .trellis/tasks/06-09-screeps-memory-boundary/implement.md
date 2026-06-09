# 实现 Memory 边界 Implementation

## Checklist

- [x] Add failing unit tests for Memory decode and writeback behavior.
- [x] Add memory boundary module with schema version and typed state.
- [x] Extend runtime boundary with narrow raw Memory read/write operations.
- [x] Thread typed memory state through tick execution without adding strategy behavior.
- [x] Update integration/e2e tests for loop behavior with Memory present.
- [x] Update docs/spec if the implemented boundary changes project contract.
- [x] Run focused tests, then `pnpm check`.
- [x] Commit this task independently.

## Validation Commands

```powershell
pnpm test:unit
pnpm test:integration
pnpm test:e2e
pnpm typecheck
pnpm lint
pnpm check
```

## Rollback Points

- Revert this task's source and test files if the boundary design starts requiring strategy-specific fields.
- Do not add compatibility branches for unknown production Memory; fail visibly until a documented migration exists.
