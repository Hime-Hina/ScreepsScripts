# Implementation plan: RCL2 roads and containers planner

## Preflight

1. Start only after immediate workforce tasks, or if live evidence shows path/source access is the bottleneck.
2. Read:
   - `AGENTS.md`
   - `.trellis/workflow.md`
   - `.trellis/spec/runtime/index.md`
   - `.trellis/spec/testing/index.md`
   - `src/construction/construction-planner.ts`
   - `test/unit/construction/construction-planner.test.ts`
   - relevant extraction/execution code in `src/runtime/screeps-runtime.ts`
3. Suggested branch: `feat/rcl2-roads-containers-planner`.
4. Do not deploy, restart, or create live construction sites unless explicitly authorized.

## RED

Add deterministic unit tests in `test/unit/construction/construction-planner.test.ts` before implementation:

1. Source container candidate:
   - given a source and walkable adjacent terrain, planner returns one container-site decision near the source.
2. Controller container/staging candidate:
   - given controller position and walkable adjacent terrain, planner returns a valid adjacent candidate.
3. Blocking behavior:
   - walls, existing structures, existing sites, spawn/extensions, and blocked positions are skipped.
4. Stability:
   - candidate order is deterministic.
5. Existing extension planning tests keep passing unchanged.

If road planning is included in the first implementation slice, add road-specific tests. If not, keep roads as an explicit follow-up in the final handoff.

Run:

```bash
pnpm vitest run test/unit/construction/construction-planner.test.ts
```

The new container/road tests should fail before implementation.

## GREEN

Implement the smallest pure-planner slice:

- extend construction snapshot types for sources/controller as needed;
- add new construction decision types only as needed, e.g. `structureType: 'container' | 'road'`;
- keep extension behavior and tests unchanged;
- use deterministic helper functions for adjacent candidate positions and position serialization.

If runtime wiring is included, update `src/runtime/screeps-runtime.ts` carefully so live execution can handle the new decision types, but avoid changing when live sites are actually created unless the existing planner execution path already handles safe site creation.

## Verification

Run:

```bash
pnpm vitest run test/unit/construction/construction-planner.test.ts
pnpm check
git diff --check
python ./.trellis/scripts/task.py validate 06-17-rcl2-roads-containers-planner
```

## Handoff report requirements

Report:

- whether the slice implemented source containers only, controller container, roads, or all three;
- changed snapshot contracts and runtime wiring, if any;
- exact tests run;
- any live operations skipped.
