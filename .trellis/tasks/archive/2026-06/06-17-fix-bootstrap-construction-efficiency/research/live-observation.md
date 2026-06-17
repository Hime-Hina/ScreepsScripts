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

## Follow-up observation: source-local construction labor

### User-observed behavior

- Containers appear to be placed on source-adjacent mining tiles.
- Workers now build from the source side, but all workers may start at the same source-side route instead of building near their assigned source.

### Read-only live room sample

Command family:

```bash
node --input-type=module <read room objects and terrain via scripts/screeps/screeps-api.mjs>
```

Observed summary for `shard1 / W51N21`:

```text
sources=2 creeps=5 spawns=1 extensions=5 constructionSites=47
source 59bbc4132052a716c3ce750c @28,5
  adjacent open tiles include 29,4 / 29,5 / 29,6
  container site @29,6 progress=1735/5000
  road site @29,7 progress=164/1500
source 59bbc4132052a716c3ce750e @19,43
  adjacent open tiles include 20,43 / 18,44 / 19,44 / 20,44
  container site @20,43 progress=60/5000
  road site @21,43 progress=0/300
```

### Container mining-slot conclusion

`OBSTACLE_OBJECT_TYPES` from `@types/screeps` does not include `container`, so containers are walkable. A source-adjacent container does not reduce available mining positions; it can be the miner standing tile. No avoid-container-mining-position logic is required for this task.

### Build target locality diagnosis

`assignHarvestSources` already assigns workers to sources, but `selectConstructionSite` receives only `roomName` and reserved construction-site ids. Therefore build target choice is room-global. With existing progress on one source-side route, all working creeps can prefer that same route even if some are assigned to the other source.

Required fix: pass each worker's assigned source into construction target selection and prefer source-local container/road construction for equivalent source-side infrastructure, with deterministic room-global fallback when no local target exists.

## Review results

### Bob local Codex CLI read-only review

Command shape:

```bash
codex exec -C /home/hh/projects/ScreepsScripts -s read-only --ephemeral --output-last-message /tmp/screeps-codex-review/source-locality-review.md - < /tmp/screeps-source-locality-codex-review.md
```

Verdict: diagnosis correct; plan is minimal and consistent with typed snapshot / domain decision architecture.

Key points:

- `assignHarvestSources` already assigns workers to sources, but `selectConstructionSite` did not receive worker or assigned-source context.
- Containers are walkable because `OBSTACLE_OBJECT_TYPES` does not include `container`.
- Required red tests: workers assigned to different sources choose source-local build targets; assigned-source road/container beats progressed equivalent work at another source; no-local-target fallback remains room-global.

### Hermes sub-agent post-implementation review

Verdict: approve.

Key points:

- The implementation keeps `src/creeps/` as a pure snapshot decision layer.
- Source locality only affects source-side container/road targets and falls back to room-global ordering when no assigned-source local target exists.
- Focused tests, `pnpm check`, and `git diff --check` passed in review.
