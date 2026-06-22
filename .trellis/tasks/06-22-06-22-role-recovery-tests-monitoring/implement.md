# Implementation plan

## RED

- Add failing spawning regression for post-builder upgrader recovery.
- Add failing runtime-alert tests for `role_composition_drift` positive and negative cases.
- Add failing API helper test for memory read/decode.
- Add failing integration test for role recovery live status command.

## GREEN

- Add `readUserMemory` helper to `scripts/screeps/screeps-api.mjs`.
- Add `scripts/screeps/role-recovery-status.mjs` and package script.
- Add role-composition drift alert selection to `src/kernel/runtime-alerts.ts`.
- Keep output and alert metrics redacted and deterministic.

## VERIFY

```bash
pnpm vitest run test/unit/spawning/spawn-decision.test.ts test/unit/kernel/runtime-alerts.test.ts test/integration/screeps-deployment/screeps-api.test.ts test/integration/screeps-deployment/role-recovery-status.test.ts
pnpm check
git diff --check
python3 .trellis/scripts/task.py validate 06-22-06-22-role-recovery-tests-monitoring
```

## Deploy gate

This task changes runtime alert output and deployment scripts. Deploy only after green checks and live readback.
