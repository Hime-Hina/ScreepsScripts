# Implementation plan

## Behavior slices

1. RED: storage placement must not reduce an extension's access from 2 tiles to 1.
   - Public interface: `planRoomConstruction`.
   - Mock boundary: pure construction snapshot, no Screeps runtime globals.

2. RED: RCL4 extension planning must produce range-3 extension sites when the radius-2 ring is saturated.
   - Public interface: `planRoomConstruction`.
   - Mock boundary: pure construction snapshot.

3. GREEN: implement access requirement as `min(2, currentAccess)` for existing targets and `2` for candidate self-access; keep the zero-access legacy exception.

4. GREEN: make near-spawn candidate radius level-aware: radius 2 before RCL4, radius 3 at RCL4+.

5. Deploy and live cleanup:
   - deploy recurrence fix;
   - verify readback;
   - re-verify target extension by id/position/type;
   - destroy only that extension;
   - monitor planner-created sites and room health.

## Context files

- `src/construction/construction-planner.ts`
- `test/unit/construction/construction-planner.test.ts`
- `scripts/screeps/role-recovery-status.mjs`
- `.trellis/spec/testing/tdd-workflow.md`
- `.trellis/spec/testing/completion-definition.md`
- `.trellis/spec/runtime/domain-boundaries.md`
