# RCL3 economy unblock and accessible layout implementation plan

## RED tests

1. `bootstrap-economy`:
   - W51N21-like safe RCL3 room with 5 workers, backlog, and non-full energy should produce development demand.
   - RCL3 unsafe/critical downgrade or below survival floor still returns survival behavior.
2. `spawn-decision`:
   - Safe RCL3 room with `availableEnergy=600`, `energyCapacity=650`, idle spawn, backlog, and worker count below target emits an affordable worker spawn decision.
   - If only emergency body is affordable, survival remains bounded and deterministic.
3. `construction-planner`:
   - Dense near-spawn cluster must reject candidates that seal an existing extension's last accessible adjacent tile.
   - W51N21-like existing structures/sites must not propose additional sealing positions.
4. Integration:
   - Main loop preserves defense, downgrade, and survival gates while allowing RCL3 development/construction in the safe case.

## GREEN implementation

1. Split demand visibility from strict full-refill energy state in `src/colony/bootstrap-economy.ts` and `src/spawning/spawn-decision.ts`.
2. Allow development demand for safe `controllerLevel >= 2` rooms.
3. Add access-preservation helper(s) in `src/construction/construction-planner.ts` for near-spawn extension/tower placement.
4. Keep runtime execution unchanged unless a new captured snapshot field is required.
5. Update docs/context only if implementation changes public runtime assumptions.

## Verification

```bash
pnpm vitest run test/unit/colony/bootstrap-economy.test.ts test/unit/spawning/spawn-decision.test.ts test/unit/construction/construction-planner.test.ts test/integration/main-loop.test.ts
pnpm check
git diff --check
python3 ./.trellis/scripts/task.py validate 06-20-rcl3-economy-unblock-accessible-layout
```

After review and explicit deploy: `pnpm deploy:screeps`, `pnpm verify:live:screeps`, `pnpm status:live:screeps`, and short monitoring for worker spawning/growth or construction progress.
