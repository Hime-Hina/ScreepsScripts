# RCL3/RCL4 safe development train implementation plan

## Step 0 — Baseline and branch hygiene

- Verify clean `main`, no active tasks, and live status healthy.
- Create this train and child tasks.
- Validate every Trellis task before starting implementation.

## Step 1 — Live cleanup task

- Start task `06-21-06-21-unblock-inaccessible-extension-live-cleanup`.
- Re-run accessibility probe for all owned spawn/extension/tower targets.
- If and only if `extension@35,22` is owned, empty/inaccessible, and no accessible adjacent tile exists, execute one console write to destroy that exact structure.
- Monitor for replacement construction site and continued room health.

## Step 2 — Active hauler logistics

- Start task `06-21-06-21-active-hauler-logistics` on a dedicated branch.
- Add failing focused tests for hauler withdraw/refill/deposit and fallback boundaries.
- Implement the smallest planner change in `src/creeps/worker-decision.ts`; adjust runtime snapshot only if tests prove missing data.
- Verify focused tests, `pnpm check`, `git diff --check`, task validation, review, deploy, PM2 restart, live status/monitoring.

## Step 3 — Controller container upgrader flow

- Repeat the same TDD and deployment gates for `upgrader` behavior.
- Ensure `hauler` changes remain green after upgrader changes.

## Step 4 — RCL4 storage and extension planning

- Add storage support and RCL4 access-safe extension planning tests.
- Keep construction site volume capped/staged.
- Deploy only after green checks and review.

## Stop/rollback conditions

Immediately stop the current task and inspect/rollback if any post-deploy sample shows:

- `status != normal` without known benign reason;
- `recoveryStates` not `roomHealthy`;
- heartbeat not verified for repeated samples;
- CPU bucket starts collapsing unexpectedly;
- worker count drops below survival floor and spawn cannot recover;
- code hash mismatch after deploy/readback;
- construction planner creates a new inaccessible owned energy target.
