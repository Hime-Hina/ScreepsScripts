# Implementation plan: Spawn request priority queue and early role body catalog

## Preflight

Read:

- `AGENTS.md`
- `.trellis/workflow.md`
- `.trellis/spec/runtime/index.md`
- `.trellis/spec/runtime/domain-boundaries.md`
- `.trellis/spec/testing/index.md`
- `src/spawning/spawn-decision.ts`
- `src/colony/bootstrap-economy.ts`
- `test/unit/spawning/spawn-decision.test.ts`

## RED

Add tests first:

1. When a room is below survival floor, selected request is survival priority.
2. When survival is stable but RCL2 development target is unmet, selected request is development priority.
3. Body selection remains 550 -> 300 -> 200 fallback.

Run:

```bash
pnpm vitest run test/unit/spawning/spawn-decision.test.ts
```

## GREEN

- Add internal request generation/selection helpers.
- Preserve public API and current returned `SpawnDecision` shape.
- Keep changes surgical inside `src/spawning/spawn-decision.ts` unless tests need minor updates.

## Verification

```bash
pnpm vitest run test/unit/spawning/spawn-decision.test.ts
pnpm check
git diff --check
python ./.trellis/scripts/task.py validate 06-17-06-17-spawn-request-priority-queue
```
