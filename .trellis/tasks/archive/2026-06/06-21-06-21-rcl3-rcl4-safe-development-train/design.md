# RCL3/RCL4 safe development train design

## Safety model

The train uses explicit gates rather than trust in a single implementation step:

1. **Read-only baseline before side effects** — status, room objects, accessibility, git state.
2. **Trellis planning** — all tasks documented before code/live writes.
3. **Bounded side effects** — live cleanup may only target `extension@35,22`; code slices may only change the relevant pure planner/runtime boundaries.
4. **TDD** — reproduce target behavior in unit/integration tests before implementation.
5. **Verification ladder** — focused tests -> `pnpm check` -> `git diff --check` -> Trellis validation -> review -> deploy/readback -> monitoring.
6. **Rollback readiness** — rely on project deploy snapshot; if live post-deploy status degrades materially, verify rollback path and execute rollback under the user's blanket authorization.

## Production-risk guardrails

- Any live write must be idempotent or target-checked immediately before execution.
- If the target no longer matches the expected type/position/owner/inaccessibility, skip the write and record the observation.
- Do not hand-place replacement sites unless the current planner fails to create one after monitoring.
- Keep role behavior fallback-safe: if a specialized role has no specialized target, it must either fall back to a safe universal behavior or return no action without blocking other creeps.
- Preserve existing action order for generic workers unless the task explicitly changes that role.
- No broad refactors in this train.

## Deployment cadence

Preferred cadence is task-by-task:

- Live cleanup can run before code because recurrence prevention already exists in the deployed planner and the current issue is a legacy built structure.
- `active-hauler-logistics` should be implemented/deployed before upgrader/storage work because it creates the first active container energy chain.
- `controller-container-upgrader-flow` consumes that chain.
- `rcl4-storage-extension-planning` then prepares the next construction stage.

## Monitoring criteria

For each live-impacting step capture:

- `status`, `recoveryStates`, `hostileCreeps`, `controllerLevel`, `controllerProgress`, `spawnEnergy`, `heartbeatSpawnEnergy`, `constructionSites`, `heartbeatConstruction`, `heartbeatCpu`, `heartbeatBucket`, `moduleHash`.
- PM2 bridge status and restart count after any deploy.
- Abnormal conditions: runtime heartbeat missing, CPU bucket collapse, worker count collapse, hostiles near core, downgrade warning/critical, construction planner creating inaccessible energy structures.
