# Implementation plan: RCL2 worker body scaling

## Preflight

1. Confirm `06-17-rcl2-development-worker-demand` is complete or explicitly accepted as a dependency assumption.
2. Read:
   - `AGENTS.md`
   - `.trellis/workflow.md`
   - `.trellis/spec/runtime/index.md`
   - `.trellis/spec/testing/index.md`
   - `src/spawning/spawn-decision.ts`
   - `test/unit/spawning/spawn-decision.test.ts`
3. Use a dedicated branch, suggested: `feat/rcl2-worker-body-scaling`.
4. Do not deploy or restart unless explicitly authorized.

## RED

Add focused tests in `test/unit/spawning/spawn-decision.test.ts`:

1. With official body part costs, `availableEnergy=550`, `energyCapacity=550`, worker count below target, expect the selected body to be the new larger tier.
2. Preserve existing 300-energy body selection when capacity/available energy is 300.
3. Preserve emergency body when only 200 energy is available.
4. Preserve custom-cost behavior so tests prove the selector still uses captured body part costs.

Run:

```bash
pnpm vitest run test/unit/spawning/spawn-decision.test.ts
```

The 550-capacity test should fail before implementation.

## GREEN

Make the smallest change in `src/spawning/spawn-decision.ts`:

- add the new body tier before the 300-energy tier;
- keep `INITIAL_WORKER_BODY` fallback;
- keep `calculateSpawnBodyCost` and captured cost usage.

Avoid broad spawn queue or role refactors.

## Verification

Run:

```bash
pnpm vitest run test/unit/spawning/spawn-decision.test.ts
pnpm check
git diff --check
python ./.trellis/scripts/task.py validate 06-17-rcl2-worker-body-scaling
```

## Handoff report requirements

Report:

- selected 550/near-550 body and cost;
- changed files;
- exact tests run;
- live deploy/restart status, if any.
