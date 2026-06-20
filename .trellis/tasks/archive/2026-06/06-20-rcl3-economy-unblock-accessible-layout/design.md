# RCL3 economy unblock and accessible layout design

## Current behavior

`selectBootstrapWorkerDemand()` currently requires `controllerLevel === 2`, controller downgrade safe, and `spawnExtensionEnergyStable`. At RCL3, W51N21 therefore falls back to survival demand even though the room is safe and has a construction backlog.

`classifySpawnExtensionEnergyState()` is binary: any depleted spawn/extension makes the room unstable. That is appropriate for some construction gates, but too strict for deciding whether the spawn can create an affordable worker.

The construction planner scans dense near-spawn positions for extensions/towers and blocks only occupied positions. It does not reserve walkable access to existing energy structures, so dense clusters can seal targets such as `extension@35,22`.

## Target behavior

### Demand policy

- Survival floor remains first: if workers are below `BOOTSTRAP_SURVIVAL_WORKER_COUNT`, request survival workers.
- Development demand is allowed for safe `controllerLevel >= 2` rooms.
- The demand calculation may continue using source/backlog/body throughput, but it must not be hidden by strict full-energy state when the spawn can afford a useful body.

### Energy policy

Introduce or derive a narrower concept for spawn affordability, separate from construction full-refill stability:

- `spawnExtensionEnergyStable` can remain for strict construction/refill decisions.
- Spawn execution already checks `availableEnergy` against body cost; demand visibility should not require all extensions full.
- Construction eligibility should require safety and enough useful room energy, not necessarily full energy capacity, when backlog exists and workers are stable.

### Accessible layout policy

Add access-aware near-spawn construction selection:

- Treat spawn, extensions, towers, containers, and construction sites as blocking for access analysis.
- For each existing/planned energy structure that must be refilled, ensure at least one adjacent non-wall, non-blocked tile remains reachable/open.
- Reject candidate extension/tower sites that would make any spawn/extension inaccessible.
- Keep the rule local and deterministic; do not introduce full base planning or traffic management.

## Boundaries

- Runtime capture may gain fields only if pure planners need them.
- No live destructive remediation in implementation.
- No miner/hauler role split in this task.
- No GM manual strategy controls in this task.
