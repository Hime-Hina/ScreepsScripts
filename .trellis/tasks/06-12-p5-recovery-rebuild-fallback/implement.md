# P5 recovery and rebuild fallback implementation plan

## Checklist

- [ ] Confirm P3 and P4 signals exist.
- [ ] Add pure room recovery state classifier tests.
- [ ] Add `planRoomRecovery` pure operation.
- [ ] Capture room/spawn/controller/creep availability needed by classifier.
- [ ] Add no-support-room blocked recovery tests.
- [ ] Optionally add `requestRebuildSupport` contract if support room snapshot exists.
- [ ] Add read-only recovery summary to live check docs/script if P4 created one.
- [ ] Update `docs/game-state.md` with current single-room recovery blockers.
- [ ] Run validation commands.

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
