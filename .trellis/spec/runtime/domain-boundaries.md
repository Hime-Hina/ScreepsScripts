# Domain Boundaries

## Purpose

Future game modules must be named after Screeps domain concepts and own complete decisions. Do not rebuild the deleted role-folder design.

## Current Owners

| Area | Owner |
| --- | --- |
| Screeps entrypoint | `src/main.ts` |
| Screeps global capture | `src/runtime/` |
| Tick orchestration | `src/kernel/` |
| Persistent memory boundary | `src/memory/` |
| Construction planning decision | `src/construction/` |
| Initial spawning decision | `src/spawning/` |
| Worker action decision | `src/creeps/` |

## Future Owners

Use these boundaries when the behavior exists:

| Domain | Owns | Does Not Own |
| --- | --- | --- |
| Colony | Room-level goals, resource priorities, high-level work allocation | Raw Screeps globals |
| Construction | Room construction planning decisions and site placement requests | Raw Screeps globals or creep build execution |
| Spawning | Future spawn queues and richer body selection | Creep execution |
| Creeps | Per-creep action execution from assigned intent | Colony-wide prioritization |
| Logistics | Energy/resource movement decisions | Combat or market policy |
| Pathing | Path search, cost matrix policy, route cache | Creep business goals |
| Defense | Threat classification, tower/rampart/defender policy | Generic room scanning |
| Market | Orders, pricing, terminal policy | Spawn or creep behavior |

Only create a domain module when a task adds behavior that belongs there.

Standard domain directory names:

- `src/memory/`
- `src/colony/`
- `src/construction/`
- `src/spawning/`
- `src/creeps/`
- `src/logistics/`
- `src/pathing/`
- `src/defense/`
- `src/market/`

These names are reserved for the domain concepts above. Do not create a domain directory until the first accepted behavior in that domain exists.

## Data Flow

Preferred runtime flow:

```text
runtime snapshot -> memory state -> kernel -> domain decision -> action request -> runtime execution
```

Raw Screeps objects are captured at the runtime boundary. Domain modules produce decisions or action requests. Runtime-owned execution applies Screeps actions.

## Action Resolution

Only one owner resolves final per-tick actions. Multiple domain modules must not directly execute Screeps actions against the same creep, spawn, or structure.

Future action contracts should make conflicts explicit, for example:

```typescript
export interface CreepIntent {
  readonly creepName: string;
  readonly priority: number;
}

export interface SpawnDecision {
  readonly spawnName: string;
  readonly priority: number;
}
```

The exact fields will be defined when implemented. Shared types such as `ColonyState`, `SpawnDecision`, and `CreepIntent` belong at the boundary that owns their invariant, not in a generic shared folder.

## Forbidden Boundaries

Do not create:

- `src/utils`
- `src/helpers`
- `src/managers`
- `src/handlers`
- A primary `src/Roles/*` architecture
- Mode-based wrappers that route unrelated behavior through flags

If naming a module is hard, stop and clarify the domain concept before editing.

Do not introduce circular imports between domains. A domain may consume typed snapshots or decisions from another owner only through an explicit exported contract.

## Complete Operations

Expose operations that preserve invariants. Do not require callers to execute a fragile sequence.

Wrong:

```typescript
const plan = buildPlan(room);
reserveEnergy(plan);
spawnFromPlan(plan);
```

Correct:

```typescript
const spawnDecision = planSpawnForColony(colonyState);
```

The exact names will depend on the implemented behavior; the rule is that the owner exposes the complete operation it owns.

## Scenario: RCL2 Construction and Worker Economy Contracts

### 1. Scope / Trigger

- Trigger: RCL2 economic behavior crosses `src/construction/`, `src/creeps/`, `src/kernel/`, and `src/runtime/`.
- This contract applies when adding or changing extension site planning, energy structure refill, construction build, or tick ordering around those decisions.

### 2. Signatures

- Construction planner: `planRoomConstruction(world: ConstructionWorldSnapshot): readonly ConstructionDecision[]`.
- Construction decision: `{ type: 'createConstructionSite'; roomName: string; structureType: 'extension'; x: number; y: number }`.
- Worker planner: `planBootstrapWorkerActions(world: WorkerWorldSnapshot): readonly WorkerActionDecision[]`.
- Worker decisions include `harvestSource`, `refillEnergyStructure`, `buildConstructionSite`, and `upgradeController`.
- Kernel result includes `constructionDecisions: readonly ConstructionDecision[]`.
- Runtime interface owns `readConstructionWorld()` and `executeConstructionDecisions(decisions)`.

### 3. Contracts

- `src/construction/` receives snapshots only: owned rooms, controller level, spawn position, terrain, structures, construction sites, and blocked positions.
- The RCL2 extension target is total existing extension structures plus extension construction sites = `5`.
- Candidate site order must be deterministic. The current rule is Chebyshev range `1` around spawn, then range `2`; each range sorts by `y`, then `x`.
- Planner must reject room edge, wall/unknown terrain, spawn tile, blocked positions, existing structures, and existing construction sites.
- `src/creeps/` receives snapshots only: creeps, sources, controllers, energy structures, and construction sites.
- Worker priority is harvest when free capacity exists; otherwise refill underfilled spawn/extension; otherwise build construction site; otherwise upgrade controller.
- Runtime resolves Screeps objects and executes `Room.createConstructionSite`, `Creep.transfer`, `Creep.build`, `Creep.harvest`, and `Creep.upgradeController`.

### 4. Validation & Error Matrix

| Condition | Required Behavior |
| --- | --- |
| RCL < 2 | Planner returns no construction decisions |
| Existing extensions plus extension sites >= 5 | Planner returns no new extension decisions |
| Candidate is edge, wall, occupied, blocked, or already has a site | Planner skips the candidate |
| Worker has free carry capacity | Worker harvest decision wins over refill/build/upgrade |
| Worker has energy and an underfilled spawn/extension exists | Worker emits `refillEnergyStructure` |
| Worker has energy, no refill target, and a construction site exists | Worker emits `buildConstructionSite` |
| Runtime cannot resolve a target object | Runtime does not invent fallback strategy; tests must expose missing capture or stale object assumptions |

### 5. Good/Base/Bad Cases

- Good: RCL2 room with no extensions emits five stable `createConstructionSite` decisions and integration tests prove the runtime boundary calls `room.createConstructionSite`.
- Base: RCL2 room with two extensions or sites emits only three more site decisions.
- Bad: planner hard-codes live room object ids, reads `Game`, or places roads/containers/repair work in the same slice.
- Bad: worker keeps both `refillSpawn` and `refillEnergyStructure` as parallel concepts.

### 6. Tests Required

- Unit tests for `planRoomConstruction` must cover missing extensions, existing extension/site count, invalid candidate skipping, and RCL1 no-op.
- Unit tests for `planBootstrapWorkerActions` must cover refill priority, build before upgrade, upgrade fallback, and empty-worker harvest assignment.
- Integration tests must stub Screeps globals only at the runtime boundary and assert `Room.createConstructionSite`, `Creep.transfer`, and `Creep.build`.
- Bundle smoke must define any Screeps constants newly read by compiled runtime code.

### 7. Wrong vs Correct

#### Wrong

```typescript
Game.rooms.W51N21.createConstructionSite(34, 22, STRUCTURE_EXTENSION);
```

#### Correct

```typescript
const constructionDecisions = planRoomConstruction(runtime.readConstructionWorld());
runtime.executeConstructionDecisions(constructionDecisions);
```
