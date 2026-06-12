# P3 defense fallback and safe mode implementation plan

## Checklist

- [x] Confirm P0 and P1 are live.
- [x] Add pure hostile classification tests.
- [x] Add `src/defense/` pure planner for safe mode decision.
- [x] Capture hostile creeps and controller safe mode fields in runtime.
- [x] Execute `activateSafeMode` through runtime boundary.
- [x] Add integration tests for harmless hostile and dangerous near-core hostile.
- [x] Decide whether tower skeleton is in this slice based on live RCL; if not, document as follow-up.
- [x] Update docs/game-state with live defense facts or blocked no-hostile condition.
- [x] Run validation commands.

## Validation Commands

```powershell
pnpm test:unit -- test/unit/defense
pnpm test:integration -- test/integration/main-loop.test.ts
pnpm test:bundle
pnpm check
```

## Risk Points

- Safe mode is scarce; false positives are expensive.
- Hostile detection by owner id/name must be tested against live API object shape.
- Tower policy should not starve tower energy if P1/P2 energy preservation says room is unsafe.

## Parallelization

Pure `src/defense/` tests may be delegated. Runtime integration and live verification should remain single-owner.
