# P5 recovery and rebuild fallback implementation plan

## Checklist

- [x] Confirm P3 and P4 signals exist.
- [x] Add pure room recovery state classifier tests.
- [x] Add `planRoomRecovery` pure operation.
- [x] Capture room/spawn/controller/creep availability needed by classifier.
- [x] Add no-support-room blocked recovery tests.
- [x] `requestRebuildSupport` contract 未实现；当前无 support room snapshot，保持诊断-only 边界。
- [x] Add read-only recovery summary to live check docs/script if P4 created one.
- [x] Update `docs/game-state.md` with current single-room recovery blockers.
- [x] Run validation commands.

## Validation Commands

```powershell
pnpm test:unit -- test/unit/colony
pnpm test:integration -- test/integration/main-loop.test.ts
pnpm test:system
pnpm check
```

## Risk Points

- Current account effectively has one active production room; automatic rebuild may be impossible.
- Do not create actions that require pathing/claim/remote visibility without those contracts.
- Recovery state names must remain factual, not optimism labels.

## Parallelization

Pure recovery classification can be developed by a sub-agent after P3/P4 signal contracts exist. Runtime integration should be single-owner.
