# Design: RCL2 development worker demand

## Current behavior

`selectBootstrapWorkerDemand` in `src/colony/bootstrap-economy.ts` returns the 5-worker RCL2 demand only when all of these are true:

- `controllerLevel === 2`
- controller downgrade state is `controllerDowngradeSafe`
- spawn/extension energy is `spawnExtensionEnergyStable`
- spawn availability is `spawnAvailable`
- `constructionBacklogEnergy > 0`

When all RCL2 extensions are complete and there are no construction sites, `constructionBacklogEnergy === 0`, so the room falls back to the survival worker target of 3 even when the room is safe and fully energized.

## Target behavior

Introduce or rename the safe RCL2 high-worker demand so it covers RCL2 development, not only active construction. In a safe RCL2 state, target 5 workers even when construction backlog is zero.

Recommended minimal shape:

```text
if workerCreepCount < BOOTSTRAP_SURVIVAL_WORKER_COUNT:
  survivalWorkerDemand
else if controllerLevel === 2
  and controllerDowngradeState.type === 'controllerDowngradeSafe'
  and energyState.type === 'spawnExtensionEnergyStable'
  and spawnAvailability.type === 'spawnAvailable':
    rcl2DevelopmentWorkerDemand target 5
else:
  survivalWorkerDemand
```

`constructionBacklogEnergy` may remain part of the input contract for other callers/tests, but it should no longer gate the safe RCL2 5-worker demand.

## Boundaries

Do not change creep body selection in this task. Do not add roads, containers, Memory directives, console writes, deploy scripts, or PM2 operations.

## Relevant files

- `src/colony/bootstrap-economy.ts` — worker demand policy and constants.
- `src/spawning/spawn-decision.ts` — consumes worker demand and currently calculates construction backlog.
- `test/unit/colony/bootstrap-economy.test.ts` — primary unit tests for demand policy.
- `test/unit/spawning/spawn-decision.test.ts` — integration of demand policy into spawn decision.

## Compatibility notes

- Preserve survival floor behavior when workers are below 3.
- Preserve conservative behavior for downgrade warning/critical/recovering states.
- Preserve conservative behavior when energy is not full or spawn is already spawning.
- Existing enum/string names may be renamed only if all tests and dependent expectations are updated. Prefer minimal naming churn unless it improves clarity.
