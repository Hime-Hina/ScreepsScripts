# Live Observation: Bootstrap construction inefficiency

## User-observed behavior

- Workers fill energy, move to construction, build once, spend only a small amount of energy, then return to the source instead of continuing to build.
- Road construction appears scattered rather than progressing from one end of a route.
- Practical result: construction progress is far slower than expected; a day of runtime produced very little road completion.

## Read-only live status sample

Command:

```bash
pnpm status:live:screeps
```

Observed summary:

```text
branch=main
room=W51N21
status=normal
controllerLevel=2
workerCount=5
spawnEnergy=300/300
constructionSites=47
constructionProgress=2650/43800
hostileCreeps=0
hostileSpawns=0
hostileTowers=0
recoveryStates=W51N21:roomHealthy
naturalTickHeartbeat=verified
heartbeatBudget=full
heartbeatBucket=10000
heartbeatWorkers=5
heartbeatSpawnEnergy=550/550
heartbeatConstruction=47
heartbeatHostiles=0
```

## Code-level diagnosis

### Worker oscillation

`src/creeps/worker-decision.ts` currently chooses collection whenever `workerCreep.freeCapacity > 0`. This makes a partial-energy builder leave the construction site immediately after one build tick.

Required fix: add explicit energy-mode hysteresis so partial-energy working workers continue spending energy until empty.

### Construction fan-out

`src/construction/construction-planner.ts` currently plans paths from spawn to each logistics anchor, then adds road positions from `roadPath.slice(1, -1)` with a room cap. This can still spread sites across routes and starts from spawn-side positions rather than source/container-side frontier positions.

Required fix: source-first route priority and anchor-to-spawn frontier creation.

### Worker build target ordering

`selectConstructionSite` currently sorts by construction-site id. With a large live backlog, id ordering is not a meaningful construction priority and can defeat route-frontier planning.

Required fix: target selection needs deterministic strategic ordering using captured construction-site metadata, not id-only sorting.
