# TDD Workflow

## Red, Green, Refactor

Every behavior change follows one vertical slice:

1. Define the public behavior in the task artifact.
2. Add one failing test for that behavior.
3. Verify the test fails for the intended reason.
4. Implement the smallest code path that passes.
5. Refactor only while the focused test is green.
6. Move to the next behavior slice.

Do not write broad Screeps strategy code before a failing test exists.

## Public Behavior

Tests should exercise public behavior, not private call order.

Current references:

- `test/unit/kernel/run-tick.test.ts` verifies `runTick` through `ScreepsTickRuntime`.
- `test/integration/main-loop.test.ts` verifies `loop` reads Screeps globals at loop time.
- `test/e2e/compiled-loop.test.ts` executes compiled `dist/main.js` in a VM context.

## Mock Boundaries

Mock only system boundaries:

- Screeps globals.
- File system.
- Time and randomness.
- Network or Screeps API calls.
- Subprocesses.
- Credentials.

Do not mock internal strategy modules to make tests pass. If a test needs that, the behavior boundary is probably wrong.

## Regression Tests

Every bug fix must add a regression test that fails without the fix. The test name should describe the broken behavior, not the implementation defect.
