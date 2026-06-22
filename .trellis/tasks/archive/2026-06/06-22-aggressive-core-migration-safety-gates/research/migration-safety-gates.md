# Aggressive Core Migration Safety Gates

## Current Read-only Evidence

Collected with read-only commands only:

```bash
node scripts/screeps/room-geometry-layout-simulator.mjs --shard shard1 --room W51N21 --padding 2
pnpm status:live:screeps
pnpm status:role-recovery:screeps
```

Live status:

```text
[status:live:screeps] branch=main shard=shard1 room=W51N21 status=normal moduleHash=4a8cb08636a351497a85a8547eb808d868fdf08fc7b83ea6ebdb9b35f320a7d8 controllerLevel=4 controllerDowngradeTime=71887593 controllerProgress=33779 workerCount=3 spawnEnergy=300/300 spawning=no constructionSites=12 constructionProgress=1808/15000 hostileCreeps=0 hostileSpawns=0 hostileTowers=0 recoveryStates=W51N21:roomHealthy recoveryBlockers=- naturalTickHeartbeat=verified tick=71847594 heartbeatShard=shard1 heartbeatRoom=W51N21 heartbeatCpu=0.16 heartbeatBucket=10000 heartbeatLimit=20 heartbeatTickLimit=500 heartbeatBudget=full heartbeatWorkers=11 heartbeatSpawnEnergy=1200/1200 heartbeatConstruction=12 heartbeatHostiles=0 constants=official-runtime-capture
```

Role/recovery status:

```text
[status:role-recovery:screeps] branch=main shard=shard1 room=W51N21 status=normal moduleHash=4a8cb08636a351497a85a8547eb808d868fdf08fc7b83ea6ebdb9b35f320a7d8 creeps=11 roleCounts=builder:2,hauler:2,miner:3,upgrader:1,worker:3 spawningRole=- constructionSites=12 constructionProgress=1848/15000 roadCritical=1/45 roadDamaged=45/45 roadMinHits=900/5000 sourceContainers=20,43:285/2000|29,6:98/2000 refillAccess=min=2 low=0/23 worst=extension@35,24:2
```

Layout snapshot:

```text
[room-geometry-layout:screeps] source=live branch=main shard=shard1 room=W51N21 status=normal moduleHash=4a8cb08636a351497a85a8547eb808d868fdf08fc7b83ea6ebdb9b35f320a7d8 bounds=18,4..40,45
legend: S spawn, T tower, G storage, E extension, e extension site, R road, r road site, C container, P rampart, W constructedWall, c controller, s source, m mineral, # wall, ~ swamp, . open
anchors: controller=26,7 sources=28,5|19,43 mineral=42,26
metrics: extensions=18 extensionSites=2 roads=45 roadSites=10 containers=3 constructionSites=12 constructionBacklog=sites=12 progress=1808/15000 remaining=13192 byType=extension:2,road:10 refillAccess=min=2 low=0/23 worst=extension@35,24:2 roadConnectivity=components=2 largest=54/55 extensionRange=1:4,2:8,3:4,4:4 capacityImpact=900->1000
    11222222222233333333334
    89012345678901234567890
04  .~#########~~.......~##
05  .~########s?~~~.....~~~
06  .~~########C~~~~....~~~
07  ~~~~####c#~R~~~~....~~~
08  ~~~~.....C?R........~~~
09  #~~~.....R?R..###...~~~
10  #~~~~~...R.R.#####..~~~
11  .~~~~~~..R.R~#####..~~~
12  .~~#~~~..R.R~####...~~~
13  ~~###~...R.R~###.....~~
14  ~~###~...R.R~##.......~
15  ~~####~..R.Rr~.........
16  ~#####~...RR~r~........
17  ~######~...R~~r~.......
18  .######~....R?~r~......
19  .#####~......R~ErE.e...
20  ..###.......##R.ErErE..
21  ..~~.....######REErT...
22  .~~~~...#######REr.E??.
23  ..~~~~..#######RES.GE..
24  ....~...####...EREEE...
25  .......####~...REEE....
26  ....#######~~.R..r....#
27  ~..#######~~~R...e....#
28  ~~.####...~~R~~~.....##
29  ~~..##.....R~~~~~....##
30  ~~...~~~..R..~~~~.....#
31  ~~...~~~~R...~~~~.....~
32  .~.###~~R....~~~.....~~
33  ~~#####R~..........~~~~
34  .~#####R..........~~~~~
35  ..######R.........~~~~.
36  ...#####R..........~~~~
37  ...#####R..........~~~~
38  ...#####R.........~~~~.
39  ..#####R......##.~~~~..
40  ######R.....~####~~~~..
41  #####R....#######.~~...
42  ###.R....########.....#
43  #sCR..~.#########.....#
44  ..?.#######..#####...##
45  ...#######....#########
```

## Migration Classification Policy

### Keep by default

- `spawn@35,23`: survival-critical; never destroy unless a replacement spawn is built and the user confirms exact coordinates.
- `storage@37,23`: logistics-critical; relocation requires a separate resource evacuation/rebuild plan.
- `tower@37,21`: defense-critical at RCL4; preserve until replacement defense coverage exists.
- Built extensions: preserve by default; removing built capacity is not code-rollbackable.
- Source containers: preserve unless replacement container/road access is already built.

### Remove-site-only candidates

- Construction sites conflicting with a user-approved road-lattice candidate may be removed only if:
  - they are zero/low progress, or the user explicitly accepts lost progress;
  - room status is `normal`;
  - `naturalTickHeartbeat=verified`;
  - `hostileCreeps=0` and no downgrade risk;
  - exact coordinates are listed in the operator packet.

### Migrate-later candidates

- Near-spawn built extensions that do not match the final lattice: replace first, destroy later.
- Obsolete roads: remove only after replacement lattice roads are built and traffic remains healthy.
- Core anchor relocation: split into a separate task; not bundled with extension-garden planner rollout.

## Explicit Operator Gate

Before any live destructive command, present this exact shape:

```text
## Proposed live cleanup
Room: W51N21
Action type: remove construction sites | destroy built structures | both
Reason: <why this is safe/needed>
Coordinates:
- <structure>@x,y progress=a/b replacement=<planned/built>
Safety evidence:
- status=normal
- heartbeat=verified
- hostiles=0
- refillAccess=min>=2 low=0
- replacement capacity=<value>
Rollback limitation: code rollback cannot restore destroyed structures
```

No console write or structure/site removal is allowed from this task without a fresh user confirmation for the listed coordinates.
