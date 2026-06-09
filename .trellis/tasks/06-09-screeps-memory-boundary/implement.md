# 实现 Memory 边界 Implementation

## Checklist

- [ ] Add failing unit tests for Memory decode and writeback behavior.
- [ ] Add memory boundary module with schema version and typed state.
- [ ] Extend runtime boundary with narrow raw Memory read/write operations.
- [ ] Thread typed memory state through tick execution without adding strategy behavior.
- [ ] Update integration/e2e tests for loop behavior with Memory present.
- [ ] Update docs/spec if the implemented boundary changes project contract.
- [ ] Run focused tests, then `pnpm check`.
- [ ] Commit this task independently.

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
