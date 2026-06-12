# P2 structure maintenance and repair fallback implementation plan

## Checklist

- [ ] Confirm P0 and P1 are live.
- [ ] Add repair target snapshot type in worker decision layer.
- [ ] Add failing unit test: damaged spawn/extension repair before build.
- [ ] Add `repairStructure` decision.
- [ ] Add failing unit test: non-critical road does not steal energy.
- [ ] Add failing unit test: wall/rampart excluded.
- [ ] Capture repairable structures in runtime worker world.
- [ ] Execute `creep.repair` through runtime boundary.
- [ ] Add integration test for repair execution and moveTo on `ERR_NOT_IN_RANGE`.
- [ ] Update docs to mark repair fallback active.
- [ ] Run validation commands.

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
