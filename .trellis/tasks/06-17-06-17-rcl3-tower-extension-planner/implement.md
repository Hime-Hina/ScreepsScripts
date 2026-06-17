# Implementation plan: RCL3 tower and extension planner slice

## Preflight

Read:

- `src/construction/construction-planner.ts`
- `src/runtime/screeps-runtime.ts`
- `test/unit/construction/construction-planner.test.ts`
- `test/integration/main-loop.test.ts`
- `.trellis/spec/runtime/index.md`
- `.trellis/spec/testing/index.md`

## RED

Add focused tests:

1. RCL3 with no tower plans exactly one tower site.
2. Existing tower site/structure suppresses new tower site.
3. RCL3 extension count follows captured extension limit.

## GREEN

Implement minimal construction snapshot and planner extensions. Avoid broad base planner abstractions.

## Verification

```bash
pnpm vitest run test/unit/construction/construction-planner.test.ts test/integration/main-loop.test.ts
pnpm check
git diff --check
python ./.trellis/scripts/task.py validate 06-17-06-17-rcl3-tower-extension-planner
```
