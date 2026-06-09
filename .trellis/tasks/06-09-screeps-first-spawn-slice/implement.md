# 实现第一个 spawn 行为切片 Implementation

## Checklist

- [ ] Confirm Memory boundary task is committed.
- [ ] Add one failing unit test for the spawn decision public behavior.
- [ ] Add the minimal spawning boundary and typed decision.
- [ ] Thread runtime snapshot and memory state through kernel only as needed.
- [ ] Add integration coverage for `loop` if runtime capture changes.
- [ ] Update docs/spec when a new domain boundary is introduced.
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

- If the behavior grows beyond a single decision, stop and split a new child task.
- If naming requires `manager`, `helper`, `options`, or mode flags, revisit the domain boundary before editing further.
