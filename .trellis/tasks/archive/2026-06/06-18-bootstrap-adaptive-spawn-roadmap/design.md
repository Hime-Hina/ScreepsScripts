# Bootstrap and RCL3 economy stabilization roadmap design

## Direction

The current architecture remains valid: runtime captures Screeps objects into snapshots, pure planners choose decisions/requests, and runtime executes final side effects. The roadmap changes the early-economy policy layers without introducing a mature-bot manager/overlord architecture.

## Revised dependency order

### 1. RCL3 economy unblock and accessible layout

Fix the immediate W51N21 stall before adding more abstractions:

- Development demand must apply to safe `controllerLevel >= 2` rooms, not only RCL2.
- Worker spawning must use an affordability concept rather than strict "every spawn/extension is full".
- Construction eligibility must not be permanently blocked by one empty extension when the room is otherwise safe and has enough useful energy.
- Near-spawn extension/tower placement must reserve access and avoid sealing existing energy structures.

### 2. Priority spawn requests

After the immediate unblock, convert internal demand into request objects with priority, request type, target gap, body catalog, and metrics. This makes later replacement and role requests deterministic instead of adding more special cases.

### 3. TTL replacement pressure

Once request target gaps exist, workers below a replacement TTL window should count against demand before they die. This prevents population cliffs like the current drop from 8 workers to 5 while spawn is idle.

### 4. Role-split container logistics

The room already has source containers and a controller container, but all are empty. After request accounting is stable, introduce explicit source miner, hauler, builder, and upgrader demand/actions while keeping emergency universal workers.

### 5. Minimal tower policy

The current tower site is blocked behind stalled construction. Once the tower can be built, add minimal attack/heal/conservative-repair behavior and energy refill priority. Keep it small and separate from full defense frameworks.

## Deferred track

`06-20-gm-runtime-strategy-switching` remains separate and P3. The live bottleneck is autonomous economy/layout policy, not operator strategy switching.
