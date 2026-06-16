# Design: Parallel construction workforce

## Public Boundary

The behavior lives in the pure worker decision boundary:

- Interface: `planBootstrapWorkerActions(workerWorld: WorkerWorldSnapshot)`
- Unit test layer: `test/unit/creeps/worker-decision.test.ts`
- Source module: `src/creeps/worker-decision.ts`

Runtime Screeps globals remain outside this slice. The runtime boundary will continue to execute returned `buildConstructionSite` decisions through existing `Creep.build` handling.

## Data Flow

```text
runtime room snapshots
  -> WorkerWorldSnapshot.constructionSites + constructionEligibilities
  -> planBootstrapWorkerActions
  -> WorkerActionDecision[]
  -> runtime executes build/upgrade/repair/refill
```

This slice changes only the pure selection step for construction decisions.

## Current Behavior

`planBootstrapWorkerActions` creates a per-tick `reservedConstructionSiteIds` set. `planBootstrapWorkerAction` passes that set into `selectConstructionSite`, and each build decision adds the chosen site id. This prevents later workers from selecting the same site, even when a single large site is the only active backlog.

## Target Behavior

- Remove construction-site exclusivity from worker build assignment.
- Keep deterministic selection by returning the lowest-id same-room construction site.
- Keep all other reservations:
  - energy pickup/withdraw/refill reservations remain amount-based
  - critical repair target reservation remains id-based
- Keep priority order exactly as currently implemented.

## Compatibility

This is intentionally conservative:

- It does not inspect construction site progress or worker build power.
- It may over-assign workers to a nearly complete site; Screeps runtime will naturally fail or no-op excess build actions once the site completes. That is acceptable for this bootstrap slice and simpler than adding progress accounting.
- Existing controller downgrade and construction eligibility gates still decide whether workers build at all.

## Test Strategy

Add one red unit test showing the desired public behavior:

- Input: two full-energy workers, one same-room construction site, full energy structures, safe controller, construction allowed.
- Expected: both workers return `buildConstructionSite` decisions targeting the same construction site.

Update the prior single-worker-reservation expectation to the new behavior, preserving deterministic ordering and fallback-to-upgrade only when no construction site exists or construction is deferred.
