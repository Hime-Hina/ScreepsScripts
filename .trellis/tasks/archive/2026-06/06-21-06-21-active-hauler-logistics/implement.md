# Active hauler logistics implementation plan

## RED tests

1. Add `hauler withdraws from source-local container before direct harvest` in `test/unit/creeps/worker-decision.test.ts`.
2. Add `hauler refills primary energy structures before surplus deposit`.
3. Add `hauler deposits surplus into controller-side container when primary and tower energy are full`.
4. Add a fallback/no-deadlock test for empty containers/no sinks.
5. If runtime snapshot fields change, add/update `test/integration/main-loop.test.ts`.

Verify RED with:

```bash
pnpm vitest run test/unit/creeps/worker-decision.test.ts -t hauler
```

## GREEN implementation

1. Add `planHaulerAction` in `src/creeps/worker-decision.ts`.
2. Add focused selectors only if needed; prefer reusing existing selector helpers.
3. Add minimal type fields only if tests prove missing data.
4. Keep changes surgical; do not alter spawn demand in this task.

## Verification

```bash
pnpm vitest run test/unit/creeps/worker-decision.test.ts -t hauler
pnpm vitest run test/unit/creeps/worker-decision.test.ts
pnpm vitest run test/integration/main-loop.test.ts
pnpm check
git diff --check
python3 .trellis/scripts/task.py validate .trellis/tasks/06-21-06-21-active-hauler-logistics
```

Then request/read independent review if available, deploy with `pnpm deploy:screeps`, restart `screeps-ops-event-bridge`, run `pnpm verify:live:screeps` and `pnpm status:live:screeps`, then take short monitoring samples.
