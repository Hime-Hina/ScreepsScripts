# Design: Bootstrap construction efficiency

## Boundaries

This task crosses three existing domain boundaries:

- `src/creeps/`: worker action planning from typed snapshots.
- `src/construction/`: construction-site planning from typed room snapshots.
- `src/runtime/`: Screeps global capture, Screeps action execution, and Screeps `Memory` interaction.

No new generic architecture layer should be introduced. Use the existing snapshot -> decision -> runtime execution pattern.

## Part 1: Worker energy-mode hysteresis

### Current failure

Current worker action planning branches on:

```text
if freeCapacity > 0 -> pickup/withdraw/harvest
else -> spend energy
```

This is wrong for build/repair/upgrade because a worker with one `WORK` spends 5 energy per tick, immediately has free capacity, and returns to harvest before spending the rest of its carried energy.

### Target contract

Introduce an explicit worker energy mode in the worker snapshot:

```typescript
type WorkerEnergyMode = 'harvesting' | 'working';
```

Required transition behavior:

```text
energy <= 0       -> harvesting
freeCapacity <= 0 -> working
otherwise         -> keep previous mode
```

Planning behavior:

```text
harvesting -> pickup / withdraw / harvest
working    -> refill / controller guard / repair / build / upgrade
```

### Runtime / Memory ownership

Preferred implementation:

- Runtime reads the prior mode from standard `creep.memory`, e.g. `creep.memory.working === true`.
- Runtime normalizes the mode using current `energy` and `freeCapacity`.
- Runtime exposes the normalized mode on `WorkerCreepSnapshot`.
- Runtime writes the normalized mode back to `creep.memory` before or during worker decision execution, so the next tick keeps partial-energy workers in working mode.

Do not place worker mode under `Memory.screepsScripts`; that project root currently only owns `schemaVersion` and rejects extra fields. Use standard Screeps `Memory.creeps` / `creep.memory`, which is already cleaned by `cleanStaleCreepMemory`.

The pure `src/creeps/` planner must not read or write Screeps `Memory` directly.

### Compatibility

Existing behavior changes intentionally:

- A worker at `energy=45, freeCapacity=5, energyMode='working'` should continue spending energy, not harvest.
- A worker at `energy=45, freeCapacity=5, energyMode='harvesting'` should continue collecting.
- A full worker should be treated as working even if previous mode was harvesting.
- An empty worker should be treated as harvesting even if previous mode was working.

Existing survival and priority behavior must be preserved inside the working branch.

## Part 2: Source-first contiguous road frontier

### Current failure

Early logistics planning can create many road sites across multiple paths. It plans full paths from spawn to each logistics anchor and then caps the combined list. This can still scatter work and creates bad live backlogs.

### Target contract

Road planning should behave as a frontier:

```text
source/container anchor -> spawn
```

Priority order:

1. Source-adjacent container anchors.
2. Nearest source route frontier.
3. Next source route frontier.
4. Controller container/route frontier.

Within one route, road positions should be considered from the target anchor side toward spawn. The planner should create only a small number of new road sites per room per planning pass, preferably one frontier step per route priority pass.

### Existing backlog handling

The live room already has many construction sites. The implementation must not assume an empty construction-site set.

Acceptable strategies:

- Use existing road construction sites on the intended path as part of the frontier and select/build the source-side useful site first.
- Allow a small source-frontier site even when total construction-site count is high, if no source-frontier site exists.
- If removing old scattered sites is required, treat that as a separate live operation requiring explicit user approval.

### Worker build target ordering

Current worker build selection sorts construction sites by id. That is arbitrary and can defeat road-frontier planning when many sites already exist.

Extend `WorkerConstructionSiteSnapshot` with the minimal fields needed for deterministic priority, likely:

```typescript
interface WorkerConstructionSiteSnapshot {
  readonly id: string;
  readonly roomName: string;
  readonly structureType: ConstructionStructureType;
  readonly x: number;
  readonly y: number;
  readonly progress?: number;
  readonly progressTotal?: number;
}
```

Use those fields to select construction targets by strategic priority rather than id-only ordering. Keep the selector deterministic.

Suggested build-site ordering:

1. extension/container sites before low-priority road sites when they are part of bootstrap infrastructure;
2. source-side road frontier before controller-side roads;
3. continue an already-progressed useful site before starting another equivalent site;
4. final tie-breakers by room, y, x, then id.

Avoid adding a broad reservation/pathing framework in this task.

## Part 3: Assigned-source construction locality

### Current failure

Workers are already assigned to sources for harvesting in `assignHarvestSources`, but that assignment is not passed into `selectConstructionSite`. Build target selection is therefore room-global. When both source routes have containers/roads, every worker can pick the same best-ranked source-side site, especially if one route already has more progress.

### Target contract

Working workers should prefer source-local construction when their assigned source has useful source-side work:

```text
assigned source local container/road frontier -> room-global bootstrap construction fallback -> upgrade
```

Locality applies only among source-side infrastructure. Extension refill/build, controller downgrade guard, critical repair, and non-source fallback priorities remain unchanged.

### Data required

No new runtime global access is needed. Existing snapshots already expose enough facts:

- `WorkerCreepSnapshot.name` for deterministic source assignment;
- `WorkerSourceSnapshot.id/x/y/roomName`;
- `WorkerConstructionSiteSnapshot.structureType/x/y/progress/progressTotal`.

### Selection rule

When comparing construction sites for a worker with an assigned source:

1. Keep structure priority first: extension/container before roads before unknowns.
2. For source-local structures (`container` and `road` near a source), prefer sites whose nearest source is the worker's assigned source.
3. Within that local group, keep useful frontier behavior: closer-to-assigned-source roads, progressed equivalent sites, then stable position/id tie-breakers.
4. If no site belongs to the assigned source, fall back to the existing room-global strategic ordering.

The rule intentionally does not avoid placing or building source-adjacent containers. Containers are walkable in Screeps and do not reduce available mining positions.

## Testing design

### Creep unit tests

Add RED tests before implementation:

- partial-energy working creep continues build;
- partial-energy working creep continues repair/upgrade fallback when no build target exists;
- partial-capacity harvesting creep continues harvest;
- empty working creep harvests;
- full harvesting creep spends energy;
- existing refill/downgrade/repair/build priority remains unchanged inside working mode.

### Runtime tests

Add or update integration tests around runtime capture/memory:

- `creep.memory.working = true`, `energy > 0`, `freeCapacity > 0` captures `energyMode='working'`;
- full creep captures working and persists memory;
- empty creep captures harvesting and persists memory;
- no direct Screeps `Memory` access appears in `src/creeps/`.

### Construction tests

Add construction planner tests:

- source route is chosen before controller route;
- route positions are emitted anchor-to-spawn;
- whole-route fan-out is capped;
- existing sites on a route are treated as part of the frontier;
- high total backlog does not cause the planner to add more scattered low-priority roads.

### Worker construction-site tests

Add worker decision tests:

- construction site id order alone does not determine build target;
- source-frontier road/container site wins over unrelated road site;
- already-progressed useful frontier site is preferred over starting a different equivalent site;
- workers assigned to different sources choose different source-local container/road targets when both sources have useful work;
- assigned-source locality wins over progressed equivalent source-side work on another source, with room-global fallback when the assigned source has no local target.

## Operational rollout

Implementation and tests should land on branch:

```text
fix/bootstrap-construction-efficiency
```

Deployment is not part of this task's automatic scope. If the code is approved and merged, live deploy should be a separate explicit step with:

1. `pnpm status:live:screeps` preflight;
2. `pnpm deploy:screeps`;
3. readback/hash verification;
4. short monitoring window;
5. a decision on whether existing scattered construction sites need explicit cleanup.
