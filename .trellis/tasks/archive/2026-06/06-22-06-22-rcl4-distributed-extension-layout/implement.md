# Implementation plan

## TDD slice

1. Add RED test for RCL4 extension distribution:
   - existing dense radius-2 extension ring is present;
   - RCL4 has missing extension capacity;
   - expected decisions are all outside Chebyshev range `2` from spawn;
   - expected decisions have no orthogonally adjacent pairs.
2. Add/keep guard tests for lower-level near-spawn planning so RCL2/RCL3 bootstrap expectations do not regress.
3. Implement a RCL4+ extension candidate list in `src/construction/construction-planner.ts`:
   - min radius `3`, max radius `5`;
   - checkerboard-preferred ordering;
   - keep refill-access checks unchanged.
4. Run focused construction tests.
5. Run full gates:
   - `pnpm check`
   - `git diff --check`
   - `python3 .trellis/scripts/task.py validate .trellis/tasks/archive/2026-06/06-22-06-22-rcl4-distributed-extension-layout`
6. Deploy and verify.
7. Live migration:
   - remove only low-progress dense extension construction sites;
   - verify replacement sites and `refillAccess`.

## Files

- `src/construction/construction-planner.ts`
- `test/unit/construction/construction-planner.test.ts`
- task docs/context under `.trellis/tasks/archive/2026-06/06-22-06-22-rcl4-distributed-extension-layout/`