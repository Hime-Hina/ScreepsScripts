# Implementation plan: RCL2 development worker demand

## Preflight

1. Read project workflow and specs:
   - `AGENTS.md`
   - `.trellis/workflow.md`
   - `.trellis/spec/runtime/index.md`
   - `.trellis/spec/testing/index.md`
2. Confirm the task branch target:
   - suggested branch: `feat/rcl2-development-worker-demand`
   - do not deploy or restart unless explicitly authorized.
3. Inspect current dirty worktree before editing. If unrelated changes exist, do not overwrite them.

## RED

Add focused expectations before implementation:

1. In `test/unit/colony/bootstrap-economy.test.ts`, add a case proving:
   - RCL2
   - controller downgrade safe
   - spawn/extension energy stable
   - spawn available
   - `constructionBacklogEnergy: 0`
   - `workerCreepCount: 4`
   selects target worker count 5.
2. Add or adjust guard cases proving unsafe states still return survival demand:
   - spawn already spawning;
   - controller warning/non-safe;
   - unstable energy;
   - below survival floor.
3. In `test/unit/spawning/spawn-decision.test.ts`, add a spawn-decision case where all five extensions exist, no construction sites exist, worker count is 4, and the planner still returns a worker spawn decision.

Verify RED with:

```bash
pnpm vitest run test/unit/colony/bootstrap-economy.test.ts test/unit/spawning/spawn-decision.test.ts
```

The new no-backlog RCL2 demand test should fail on the current implementation.

## GREEN

Implement the minimal change in `src/colony/bootstrap-economy.ts`:

- let safe RCL2 development demand select the existing 5-worker target without requiring `constructionBacklogEnergy > 0`;
- keep survival and unsafe fallbacks unchanged;
- keep source changes surgical.

If a type/name rename is made, update tests and callers consistently.

## Verification

Run:

```bash
pnpm vitest run test/unit/colony/bootstrap-economy.test.ts test/unit/spawning/spawn-decision.test.ts
pnpm check
git diff --check
python ./.trellis/scripts/task.py validate 06-17-rcl2-development-worker-demand
```

## Handoff report requirements

Report:

- changed files;
- exact test commands and pass/fail results;
- whether any live deploy/restart was skipped;
- any behavior intentionally left for follow-up tasks.
