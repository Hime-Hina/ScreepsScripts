# Layout Rollout Rehearsal and Monitoring Packet

## Current Read-only Baseline

Layout command:

```bash
node scripts/screeps/room-geometry-layout-simulator.mjs --shard shard1 --room W51N21 --padding 2
```

Status commands:

```bash
pnpm status:live:screeps
pnpm status:role-recovery:screeps
```

Baseline status:

```text
[status:live:screeps] branch=main shard=shard1 room=W51N21 status=normal moduleHash=4a8cb08636a351497a85a8547eb808d868fdf08fc7b83ea6ebdb9b35f320a7d8 controllerLevel=4 controllerDowngradeTime=71887593 controllerProgress=33779 workerCount=3 spawnEnergy=300/300 spawning=no constructionSites=12 constructionProgress=1808/15000 hostileCreeps=0 hostileSpawns=0 hostileTowers=0 recoveryStates=W51N21:roomHealthy recoveryBlockers=- naturalTickHeartbeat=verified tick=71847594 heartbeatShard=shard1 heartbeatRoom=W51N21 heartbeatCpu=0.16 heartbeatBucket=10000 heartbeatLimit=20 heartbeatTickLimit=500 heartbeatBudget=full heartbeatWorkers=11 heartbeatSpawnEnergy=1200/1200 heartbeatConstruction=12 heartbeatHostiles=0 constants=official-runtime-capture
```

Baseline role/recovery:

```text
[status:role-recovery:screeps] branch=main shard=shard1 room=W51N21 status=normal moduleHash=4a8cb08636a351497a85a8547eb808d868fdf08fc7b83ea6ebdb9b35f320a7d8 creeps=11 roleCounts=builder:2,hauler:2,miner:3,upgrader:1,worker:3 spawningRole=- constructionSites=12 constructionProgress=1848/15000 roadCritical=1/45 roadDamaged=45/45 roadMinHits=900/5000 sourceContainers=20,43:285/2000|29,6:98/2000 refillAccess=min=2 low=0/23 worst=extension@35,24:2
```

## Dry-run Review Packet Requirements

Before deployment or cleanup, attach/show:

1. selected candidate ASCII map;
2. extension and road coordinate diff;
3. construction-site cleanup list, if any;
4. built-structure migration list, if any;
5. expected energy capacity before/after;
6. `refillAccess` before/after target;
7. rollback path and limits;
8. stop conditions.

## Rollout Gate Sequence

Do not execute these without explicit user approval at rollout time.

```bash
pnpm vitest run test/unit/construction/construction-planner.test.ts test/unit/construction/layout-stamp.test.ts test/unit/screeps-deployment/room-geometry-layout.test.ts test/integration/screeps-deployment/room-geometry-layout-simulator.test.ts
pnpm check
git diff --check
python ./.trellis/scripts/task.py validate 06-22-rcl-staged-extension-garden-planner
python ./.trellis/scripts/task.py validate 06-22-aggressive-core-migration-safety-gates
python ./.trellis/scripts/task.py validate 06-22-layout-rollout-rehearsal-monitoring
```

If approved later:

```bash
pnpm deploy:screeps
pnpm verify:live:screeps
pnpm status:live:screeps
pnpm status:role-recovery:screeps
```

Optional bridge smoke after deploy approval:

```bash
pnpm ops:event-bridge:screeps -- --shard shard1 --max-console-updates 2 --timeout-ms 90000
```

## Short Monitor Fields

Track at least:

- module hash;
- room status;
- natural tick heartbeat;
- controller level / downgrade time;
- worker and role counts;
- spawn energy and room energy from heartbeat;
- construction site count and progress;
- extension/site count and energy capacity impact;
- `refillAccess=min=<n> low=<count>/<total>`;
- road connectivity components/largest;
- hostile creeps/spawns/towers;
- CPU bucket;
- PM2 bridge status if restarted.

## Stop Conditions

Stop rollout and do not continue destructive cleanup if any appears:

- `status != normal`;
- heartbeat not verified;
- hostile creeps/spawns/towers present;
- `refillAccess` falls below accepted threshold;
- `workerCount` or role recovery indicates survival risk;
- construction progress stalls after migration;
- new `runtime_action_failure` or `ERR_NOT_IN_RANGE` event appears;
- PM2 bridge becomes unstable.
