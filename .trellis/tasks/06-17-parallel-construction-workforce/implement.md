# Implementation Plan: Parallel construction workforce

## Preconditions

- Branch: `task/parallel-construction-workforce`
- Base: `main`
- Live deploy is out of scope.
- No Screeps console writes or Memory writes.

## Steps

1. Add/update worker decision unit test.
   - File: `test/unit/creeps/worker-decision.test.ts`
   - Behavior: multiple full-energy workers can target the same allowed construction site.
   - Verify RED with focused vitest command.

2. Implement minimal source change.
   - File: `src/creeps/worker-decision.ts`
   - Remove construction-site id reservation from the build path.
   - Keep repair target reservation and energy reservations unchanged.

3. Verify focused behavior.
   - `pnpm vitest run test/unit/creeps/worker-decision.test.ts`

4. Run broader local gates.
   - `pnpm test:unit`
   - `pnpm check`

5. Review diff.
   - Confirm no unrelated formatting or strategy changes.
   - Confirm task docs match final behavior.

6. Optional independent review.
   - Ask Codex Worker to sync the branch and perform read-only review.

## Validation Results

- RED check: `pnpm vitest run test/unit/creeps/worker-decision.test.ts` failed as expected before implementation; `WorkerB` upgraded instead of building the same construction site.
- Focused GREEN check: `pnpm vitest run test/unit/creeps/worker-decision.test.ts` passed: 24 tests.
- Full local gate: `pnpm check` passed with `CHECK_EXIT:0`.
- Diff hygiene: `git diff --check` passed with `DIFF_CHECK_EXIT:0`.
- Trellis context validation: `task.py validate 06-17-parallel-construction-workforce` passed.

## Rollback

This slice is local source/test/task artifact changes only. Rollback is a normal git revert/reset before merge; no live rollback is involved.
