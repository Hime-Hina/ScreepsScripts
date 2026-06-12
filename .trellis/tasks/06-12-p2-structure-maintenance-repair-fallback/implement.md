# P2 structure maintenance and repair fallback implementation plan

## Checklist

- [x] Confirm P0 and P1 are live.
- [x] Add repair target snapshot type in worker decision layer.
- [x] Add failing unit test: damaged spawn/extension repair before build.
- [x] Add `repairStructure` decision.
- [x] Add failing unit test: non-critical road does not steal energy.
- [x] Add failing unit test: wall/rampart excluded.
- [x] Capture repairable structures in runtime worker world.
- [x] Execute `creep.repair` through runtime boundary.
- [x] Add integration test for repair execution and moveTo on `ERR_NOT_IN_RANGE`.
- [x] Update docs to mark repair fallback active.
- [x] Run validation commands.

## Validation Commands

```powershell
pnpm test:unit -- test/unit/creeps/worker-decision.test.ts
pnpm test:integration -- test/integration/main-loop.test.ts
pnpm test:bundle
pnpm check
```

## Risk Points

- Repair can consume all early energy if thresholds are too broad.
- Wall/rampart repair must stay out of P2 or it becomes a defense/fortification task.
- If road/container planning is added before repair is live, maintenance debt can kill the economy.

## Parallelization

Pure repair target selection can be developed by a sub-agent if P1 runtime integration is not touching the same files. Runtime integration should remain single-owner.
