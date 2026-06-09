# 实现第一个 spawn 行为切片 Implementation

## Checklist

- [x] Confirm Memory boundary task is committed.
- [x] Add one failing unit test for the spawn decision public behavior.
- [x] Add the minimal spawning boundary and typed decision.
- [x] Thread runtime snapshot and memory state through kernel only as needed.
- [x] Add integration coverage for `loop` if runtime capture changes.
- [x] Update docs/spec when a new domain boundary is introduced.
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

- If the behavior grows beyond a single decision, stop and split a new child task.
- If naming requires `manager`, `helper`, `options`, or mode flags, revisit the domain boundary before editing further.
