# Bootstrap adaptive spawn roadmap design

## Architecture direction

Keep local boundaries:

- `src/colony/bootstrap-economy.ts`: demand model and room-economy classification.
- `src/spawning/spawn-decision.ts`: spawn request generation, priority, body selection, final spawn decision.
- `src/runtime/screeps-runtime.ts`: Screeps API capture only; no policy.

## Roadmap shape

### 1. Adaptive worker demand

Add room snapshot fields needed for a throughput demand model:

- source count;
- current worker WORK part total;
- selected/planned worker body WORK parts from spawn capacity.

Demand target becomes dynamic:

```text
survival floor = 3
development target = max(source-saturation target, construction-work target, survival floor)
target = min(development target, aggressive cap)
```

### 2. Priority spawn requests

Convert the existing internal request objects into a richer request layer carrying:

- room name;
- type;
- target gap;
- priority;
- body catalog;
- demand reason metrics.

Selection still returns one `SpawnDecision`, but it chooses from all executable requests.

### 3. TTL replacement pressure

Include workers whose `ticksToLive` is below a configured replacement window in target-gap computation. This follows Quorum-style `respawnAge` behavior and prevents worker cliff drops.

### 4. Role split

After spawn requests exist, split universal worker demand into per-role demands. Start with miner/builder/hauler/upgrader for RCL2/RCL3, keeping emergency universal worker as a separate high-priority request.

## Compatibility stance

The old fixed target is removed. Tests should assert the new dynamic outcomes directly rather than maintaining old fixed-count behavior.
