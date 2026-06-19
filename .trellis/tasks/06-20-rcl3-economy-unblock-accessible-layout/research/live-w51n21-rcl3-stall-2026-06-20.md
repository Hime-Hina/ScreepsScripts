# W51N21 RCL3 live evidence — 2026-06-20

Source: read-only live status and room-object API samples after deploying `d757693150fe43f9e8ace1f16112791d80158691fddbc8706833ed2867e37a91`.

## Live status

- Room: `W51N21` / `shard1`.
- Screeps branch: `main`.
- Status: `normal`.
- Recovery: `W51N21:roomHealthy`.
- Natural tick heartbeat: verified.
- RCL: 3.
- Workers: 5.
- Spawn: `300/300`, idle.
- Heartbeat spawn+extension energy: `600/650`.
- Construction: 4 sites, `1224/14000` progress.
- Hostiles: 0.
- CPU bucket: 10000.
- Construction progress remained `1224/14000` across repeated samples.

## Room objects

- Spawn: `35,23`, full energy.
- Controller: `26,7`.
- Sources:
  - `28,5`, adjacent walkable slots: 3 (`29,4~`, `29,5~`, `29,6~`).
  - `19,43`, adjacent walkable slots: 4 (`20,43`, `18,44`, `19,44`, `20,44`).
- Mineral: `H @ 42,26`.
- Structures: `spawn=1`, `extension=7`, `road=45`, `container=3`, `tower=0`.
- Construction sites:
  - extension `35,24` `0/3000`.
  - extension `36,24` `0/3000`.
  - extension `36,21` `1224/3000`.
  - tower `37,21` `0/5000`.
- Containers:
  - source container `29,6`, `0/2000`.
  - source container `20,43`, `0/2000`.
  - controller container `27,8`, `0/2000`.
- Energy structures include extension `35,22` at `0/50`; it is surrounded by spawn/extensions/construction-site coordinates in the current near-spawn cluster.

## Current diagnosis

The room is healthy but development is stalled. The immediate bottleneck is not rollback-worthy survival failure. The likely code-level blockers are:

1. `selectBootstrapWorkerDemand()` currently returns survival demand when `controllerLevel !== 2`, so RCL3 loses development worker demand.
2. Both worker demand and construction eligibility rely on the strict `spawnExtensionEnergyStable` state, so one unfilled/possibly inaccessible extension can block further worker growth and construction.
3. The near-spawn construction planner can produce dense structures/sites around spawn/extensions without reserving access, creating inaccessible energy structures such as the current `35,22` extension.

No live destructive write was performed. Any structure destroy/rebuild for `35,22` must be an explicit later operation after code prevents recurrence.
