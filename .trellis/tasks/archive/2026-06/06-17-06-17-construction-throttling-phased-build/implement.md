# Implementation plan: Construction site throttling and phased logistics build

## Preflight

Read:

- `AGENTS.md`
- `.trellis/workflow.md`
- `.trellis/spec/runtime/index.md`
- `.trellis/spec/runtime/domain-boundaries.md`
- `.trellis/spec/runtime/cpu-budget.md`
- `.trellis/spec/testing/index.md`
- `src/construction/construction-planner.ts`
- `test/unit/construction/construction-planner.test.ts`
- `test/integration/main-loop.test.ts`

## RED

Add tests before implementation:

1. A logistics scenario with a long road path returns at most the road cap.
2. Existing active road construction sites suppress further road decisions while still allowing missing extension decisions in an extension-focused scenario.
3. Existing container decisions remain ahead of road decisions.

Run focused test and confirm failures:

```bash
pnpm vitest run test/unit/construction/construction-planner.test.ts
```

## GREEN

- Add a small pure throttling helper in `src/construction/construction-planner.ts`.
- Keep phase order explicit and deterministic.
- Do not add global config or Memory fields.

## Verification

```bash
pnpm vitest run test/unit/construction/construction-planner.test.ts test/integration/main-loop.test.ts
pnpm check
git diff --check
python ./.trellis/scripts/task.py validate 06-17-06-17-construction-throttling-phased-build
```

## Handoff report

Report constants chosen, changed files, focused/full verification results, and whether live deploy was skipped.
