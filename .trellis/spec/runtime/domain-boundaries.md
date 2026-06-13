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
| Room economy safety and bootstrap demand | `src/colony/` |
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
- This contract applies when adding or changing extension site planning, energy structure refill, critical structure repair, construction build, or tick ordering around those decisions.

### 2. Signatures

- Construction planner: `planRoomConstruction(world: ConstructionWorldSnapshot): readonly ConstructionDecision[]`.
- Construction decision: `{ type: 'createConstructionSite'; roomName: string; structureType: 'extension'; x: number; y: number }`.
- Worker planner: `planBootstrapWorkerActions(world: WorkerWorldSnapshot): readonly WorkerActionDecision[]`.
- Worker decisions include `harvestSource`, `refillEnergyStructure`, `repairStructure`, `buildConstructionSite`, and `upgradeController`.
- Kernel result includes `constructionDecisions: readonly ConstructionDecision[]`.
- Runtime interface owns `readConstructionWorld()` and `executeConstructionDecisions(decisions)`.

### 3. Contracts

- `src/construction/` receives snapshots only: owned rooms, controller level, spawn position, terrain, structures, construction sites, and blocked positions.
- The RCL2 extension target is total existing extension structures plus extension construction sites = `5`.
- Candidate site order must be deterministic. The current rule is Chebyshev range `1` around spawn, then range `2`; each range sorts by `y`, then `x`.
- Planner must reject room edge, wall/unknown terrain, spawn tile, blocked positions, existing structures, and existing construction sites.
- `src/creeps/` receives snapshots only: creeps, sources, owned controllers with `level` and `ticksToDowngrade`, energy structures, supported repair targets, and construction sites.
- Supported P2 repair targets are existing spawn, extension, container, and road structures in owned rooms. Do not include walls or ramparts in this contract.
- Repair target snapshots include captured runtime `hits` and `hitsMax`; worker policy must not maintain a local official structure hits table.
- Worker priority is harvest when free capacity exists; otherwise refill underfilled spawn/extension; otherwise apply controller downgrade guard; otherwise repair critical supported structures; otherwise build construction sites; otherwise upgrade.
- Controller downgrade guard classifies owned controller `ticksToDowngrade`: `< 5000` critical, `< 8000` warning, `< 9000` recovering, `>= 9000` safe.
- In critical state, all full-energy workers in the room upgrade controller before build. In warning or recovering state, the first full-energy worker by creep name upgrades before build. In safe state, build construction site remains before upgrade controller.
- Runtime resolves Screeps objects and executes `Room.createConstructionSite`, `Creep.transfer`, `Creep.repair`, `Creep.build`, `Creep.harvest`, and `Creep.upgradeController`.

### 4. Validation & Error Matrix

| Condition | Required Behavior |
| --- | --- |
| RCL < 2 | Planner returns no construction decisions |
| Existing extensions plus extension sites >= 5 | Planner returns no new extension decisions |
| Candidate is edge, wall, occupied, blocked, or already has a site | Planner skips the candidate |
| Worker has free carry capacity | Worker harvest decision wins over refill/build/upgrade |
| Worker has energy and an underfilled spawn/extension exists | Worker emits `refillEnergyStructure` |
| Worker has energy, no refill target, a safe controller, and a construction site exists | Worker emits `buildConstructionSite` |
| Controller is recovering or warning with no refill target | First full-energy worker by creep name emits `upgradeController`; later full-energy workers may build |
| Controller is critical with no refill target | Every full-energy worker emits `upgradeController` |
| Supported structure is critical and no refill or controller guard applies | Worker emits `repairStructure` before ordinary build |
| Wall or rampart is damaged | Runtime does not capture it as a P2 worker repair target |
| Road is damaged but above the critical threshold | Worker keeps ordinary build or upgrade ahead of road repair |
| Runtime cannot resolve a target object | Runtime does not invent fallback strategy; tests must expose missing capture or stale object assumptions |

### 5. Good/Base/Bad Cases

- Good: RCL2 room with no extensions emits five stable `createConstructionSite` decisions and integration tests prove the runtime boundary calls `room.createConstructionSite`.
- Base: RCL2 room with two extensions or sites emits only three more site decisions.
- Bad: planner hard-codes live room object ids, reads `Game`, or places roads/containers/repair work in the same slice.
- Bad: worker keeps both `refillSpawn` and `refillEnergyStructure` as parallel concepts.

### 6. Tests Required

- Unit tests for `planRoomConstruction` must cover missing extensions, existing extension/site count, invalid candidate skipping, and RCL1 no-op.
- Unit tests for `planBootstrapWorkerActions` must cover refill priority, safe build before upgrade, recovering/warning/critical downgrade guard, critical supported repair before build, non-critical road repair staying below build/upgrade, upgrade fallback, and empty-worker harvest assignment.
- Integration tests must stub Screeps globals only at the runtime boundary and assert `Room.createConstructionSite`, `Creep.transfer`, `Creep.repair`, `Creep.build`, runtime capture of owned controller `ticksToDowngrade`, and wall/rampart repair exclusion.
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

## Scenario: P1 Bootstrap Economy Backpressure Contracts

### 1. Scope / Trigger

- Trigger: RCL2 bootstrap economy needs construction backpressure, survival-safe worker expansion, and opportunistic worker energy.
- This contract applies when changing `src/colony/bootstrap-economy.ts`, bootstrap spawning demand, or worker construction eligibility.

### 2. Signatures

- Colony demand: `selectBootstrapWorkerDemand(input: BootstrapWorkerDemandInput): BootstrapWorkerDemand`.
- Colony construction eligibility: `selectRoomConstructionEligibility(input: RoomConstructionEligibilityInput): RoomConstructionEligibility`.
- Spawning planner: `planBootstrapWorkerSpawn(world: SpawningWorldSnapshot): SpawnDecision | null`.
- Worker planner: `planBootstrapWorkerActions(world: WorkerWorldSnapshot): readonly WorkerActionDecision[]`.
- `src/colony/` owns room-level economy safety contracts that are shared by spawning and worker action planning.
- `src/spawning/` consumes `BootstrapWorkerDemand` and owns the final spawn decision.
- `src/creeps/` consumes `RoomConstructionEligibility` and owns the final worker action decision.
- `src/runtime/` captures Screeps official constants and runtime objects; strategy modules must not read Screeps globals.

### 3. Contracts

- Bootstrap survival floor is `3` generic workers.
- RCL2 construction expansion target is `5` generic workers.
- Construction is allowed only when controller downgrade state is safe, spawn/extension energy is stable, survival worker population is stable, and `RoomDefenseState` is `roomSafe`.
- RCL2 construction worker demand is allowed only when controller downgrade state is safe, spawn/extension energy is stable, a spawn is available, and construction backlog exists.
- Controller downgrade thresholds are project policy and are classified by the colony economy contract; do not duplicate the numeric thresholds in spawning or worker modules.
- Per-tick worker target reservations remain planner-local and must not persist to `Memory`.

### 4. Validation & Error Matrix

| Condition | Required Behavior |
| --- | --- |
| Worker count below `3` | Spawning may request a survival worker when a spawn can build one |
| Worker count `3` to `4`, RCL2, safe controller, stable energy, available spawn, and backlog | Spawning may request workers up to target `5` |
| Controller not safe, energy unstable, spawn already spawning, or no backlog | Demand remains at survival floor `3` |
| Construction deferred for survival | Full-energy workers refill or upgrade instead of building |
| Construction deferred for defense | Full-energy workers refill or upgrade instead of building |
| Dropped/tombstone/ruin/store energy exists in the worker room | Empty workers prefer pickup/withdraw before source harvest |
| Limited pickup/withdraw/refill/build target is already reserved this tick | Later workers choose another valid target or fallback action |

### 5. Good/Base/Bad Cases

- Good: runtime captures `BODYPART_COST`, `CONTROLLER_STRUCTURES`, dropped resources, tombstones, ruins, and owned stores, then passes narrow snapshots into pure planners.
- Good: `src/colony/` classifies controller safety once and both spawning and worker decisions consume that contract.
- Base: a safe RCL2 room with full spawn/extension energy and extension backlog grows from 3 to 5 generic workers.
- Bad: worker or spawning modules duplicate controller downgrade threshold numbers or read Screeps globals directly.
- Bad: build pause is represented by a boolean/options/mode flag instead of `RoomConstructionEligibility`.

### 6. Tests Required

- Unit tests for `selectBootstrapWorkerDemand` must cover survival floor, RCL2 construction target, unsafe controller, unstable energy, unavailable spawn, and no backlog.
- Unit tests for `planBootstrapWorkerSpawn` must prove body cost, construction cost, and RCL structure limits come from captured official constants.
- Unit tests for `planBootstrapWorkerActions` must prove construction deferred workers fall back to refill/upgrade and target reservations prevent same-tick over-assignment.
- Integration tests must prove runtime captures dropped/tombstone/ruin/store energy and executes `pickup` / `withdraw` through the runtime boundary.
- Bundle smoke must define every Screeps constant read by compiled runtime code.

### 7. Wrong vs Correct

#### Wrong

```typescript
const BOOTSTRAP_WORKER_COUNT = 5;
const canBuild = controllerSafe && energyStable;
```

#### Correct

```typescript
const workerDemand = selectBootstrapWorkerDemand(economyInput);
const constructionEligibility = selectRoomConstructionEligibility(economyInput);
```

## Scenario: P3 Defense Fallback and Safe Mode Contracts

### 1. Scope / Trigger

- Trigger: P3 defense fallback crosses `src/runtime/`, `src/kernel/`, `src/defense/`, `src/colony/`, and `src/creeps/`.
- This contract applies when adding or changing hostile capture, threat classification, room defense state, safe mode activation, or construction pause under threat.

### 2. Signatures

- Defense planner: `planRoomDefense(world: DefenseWorldSnapshot): RoomDefensePlan`.
- Defense world: captured body part constants, body part powers, owned controller safe-mode fields, owned core structures, hostile creep snapshots, and visible room names.
- Defense decision: `{ type: 'activateSafeMode'; controllerId: string; hostileCreepId: string; roomName: string }`.
- Room defense state: `{ type: 'roomSafe' | 'roomUnsafe'; roomName: string }`.
- Runtime interface owns `readDefenseWorld()` and `executeDefenseDecisions(decisions)`.
- Kernel passes `defensePlan.roomDefenseStates` into `readWorkerWorld(roomDefenseStates)` before worker planning.

### 3. Contracts

- `src/runtime/` is the only owner of `FIND_HOSTILE_CREEPS`, body part constants, `ATTACK_POWER`, `RANGED_ATTACK_POWER`, `DISMANTLE_POWER`, `HEAL_POWER`, controller safe-mode fields, and `StructureController.activateSafeMode()`.
- `src/defense/` receives snapshots only and must not read `Game`, `Memory`, or Screeps globals.
- Hostile classification currently exposes `canDamage`, `canDismantle`, `canHeal`, and `nearCore`; it is not a full combat simulator.
- `canDamage` comes from active `ATTACK` and `RANGED_ATTACK` parts with captured official power greater than zero.
- `canDismantle` comes from active `WORK` parts with captured `DISMANTLE_POWER` greater than zero.
- `canHeal` comes from active `HEAL` parts with captured `HEAL_POWER` greater than zero.
- Core structures for P3 safe mode are owned `spawn`, `extension`, and `tower` snapshots. Tower behavior remains a later RCL3 slice.
- Safe mode decision requires a dangerous hostile near a core structure, `safeModeAvailable > 0`, no active safe mode, no safe mode cooldown, and no `upgradeBlocked`.
- Because Screeps permits only one active safe-mode room per shard, planner emits at most one deterministic `activateSafeMode` decision per tick.
- `roomUnsafe` means a hostile with attack or dismantle capability exists in the room; it pauses non-critical build through `RoomConstructionEligibility` even when safe mode is not activated.

### 4. Validation & Error Matrix

| Condition | Required Behavior |
| --- | --- |
| Hostile has only harmless active parts such as `MOVE` | Room remains `roomSafe`; no safe mode decision |
| Hostile has active `ATTACK` or `RANGED_ATTACK` near core | Planner emits `activateSafeMode` when controller is available |
| Hostile has active `WORK` near core | Planner emits `activateSafeMode` when controller is available |
| Dangerous hostile is far from core | Room becomes `roomUnsafe`; no safe mode decision |
| Controller has no activation, active safe mode, cooldown, or `upgradeBlocked` | No safe mode decision |
| Multiple rooms qualify for safe mode in one tick | Planner emits one deterministic decision only |
| Runtime cannot resolve safe-mode controller id | Runtime throws a boundary error; defense planner must not invent fallback action |
| Room is `roomUnsafe` | Worker construction eligibility returns `constructionDeferredForDefense`; workers fall back to refill/upgrade |

### 5. Good/Base/Bad Cases

- Good: runtime captures hostile body part snapshots and official combat constants, planner classifies threat from the snapshot, then runtime executes `controller.activateSafeMode`.
- Good: a dangerous hostile away from the core pauses construction without consuming safe mode.
- Base: a harmless MOVE-only hostile near spawn records hostile classification but leaves construction running.
- Bad: defense planner reads `Game.rooms`, hard-codes combat power values, or calls `activateSafeMode` directly.
- Bad: construction pause is represented by a boolean flag instead of `RoomDefenseState` flowing into `RoomConstructionEligibility`.

### 6. Tests Required

- Unit tests for `planRoomDefense` must cover harmless scout, attack/ranged attack, dismantle, heal classification, controller unavailable conditions, and distant dangerous hostile.
- Unit tests must prove hostile threat classification uses captured official body-part power constants.
- Integration tests must prove runtime captures hostile body/owner/hits/position and executes `controller.activateSafeMode`.
- Integration tests must prove harmless hostile does not pause construction, while dangerous distant hostile pauses construction without safe mode activation.
- Bundle smoke must define every Screeps constant newly read by compiled runtime code.

### 7. Wrong vs Correct

#### Wrong

```typescript
if (Game.rooms.W51N21.find(FIND_HOSTILE_CREEPS).length > 0) {
  Game.rooms.W51N21.controller?.activateSafeMode();
}
```

#### Correct

```typescript
const defensePlan = planRoomDefense(runtime.readDefenseWorld());
runtime.executeDefenseDecisions(defensePlan.decisions);
const workerWorld = runtime.readWorkerWorld(defensePlan.roomDefenseStates);
```

## Scenario: P5 Room Recovery Diagnostics

### 1. Scope / Trigger

- Trigger: P5 recovery fallback introduces fallen room, missing spawn, missing creep population, controller loss, and rebuild blocker diagnostics.
- This contract applies when adding or changing `src/colony/room-recovery.ts`, live recovery status output, or future rebuild request contracts.

### 2. Signatures

- Recovery planner: `planRoomRecovery(world: RoomRecoveryWorldSnapshot): RoomRecoveryPlan`.
- Recovery room snapshot includes room name, controller ownership/downgrade state, owned spawn presence, worker count, and `RoomDefenseState`.
- Recovery states include `roomHealthy`, `roomDegraded`, `spawnMissing`, `creepPopulationMissing`, `controllerLost`, and `rebuildBlocked`.
- Recovery plan currently returns `rebuildRequests: []`.
- Live status command prints recovery diagnostics through `recoveryStates` and `recoveryBlockers`.

### 3. Contracts

- `src/colony/` owns pure room recovery classification.
- Recovery classification receives snapshots only and must not read `Game`, `Memory`, Screeps globals, API credentials, or live object ids.
- `controllerLost` has priority over spawn and creep population diagnostics.
- `spawnMissing` records the room fact. If no owned support room exists, also record `rebuildBlocked` with reason `noOwnedSupportRoom`.
- If another owned room exists but cross-room support contracts are missing, keep rebuild blocked with reason `rebuildSupportContractMissing`.
- `creepPopulationMissing` uses `BOOTSTRAP_SURVIVAL_WORKER_COUNT`; do not duplicate the survival floor in TypeScript strategy modules.
- `roomDegraded` records existing survival pressure such as non-safe controller downgrade state or `roomUnsafe`.
- Current P5 does not generate `requestRebuildSupport`, pathfind across rooms, execute claim, or fabricate rebuild actions from diagnostics.

### 4. Validation & Error Matrix

| Condition | Required Behavior |
| --- | --- |
| Owned controller, owned spawn, survival worker count met, safe controller, safe room | Return `roomHealthy` |
| Owned controller and owned spawn, but controller downgrade state is not safe | Return `roomDegraded` with the downgrade state as reason |
| Owned controller and owned spawn, but defense state is `roomUnsafe` | Return `roomDegraded` with reason `roomUnsafe` |
| Owned controller exists but owned spawn is absent | Return `spawnMissing` |
| Spawn is absent and no other owned room exists | Also return `rebuildBlocked` with reason `noOwnedSupportRoom` and no rebuild request |
| Spawn is absent and another owned room exists before support contracts exist | Return `rebuildBlocked` with reason `rebuildSupportContractMissing` and no rebuild request |
| Owned spawn exists but worker count is below survival floor | Return `creepPopulationMissing`; P0/P1 owns emergency spawn/worker action |
| Controller is no longer owned | Return `controllerLost`; do not also report spawn rebuild diagnostics |

### 5. Good/Base/Bad Cases

- Good: status output for a healthy single room includes `recoveryStates=W51N21:roomHealthy recoveryBlockers=-`.
- Good: unit tests prove a single-room missing spawn produces `spawnMissing` plus `rebuildBlocked` and no `requestRebuildSupport`.
- Base: current live room has spawn and worker population, so recovery diagnostics are read-only status evidence.
- Bad: recovery planner reads `Game.rooms`, hard-codes `W51N21` / `Spawn1`, creates pathfinding, or emits claim/rebuild actions without support-room contracts.

### 6. Tests Required

- Unit tests for `planRoomRecovery` must cover healthy, degraded, spawn missing, creep population missing, controller lost, and rebuild blocked.
- Integration tests for `status:live:screeps` must cover read-only recovery status output, including single-room `spawnMissing` / `rebuildBlocked`.
- Future tests for `requestRebuildSupport` are required before emitting any cross-room rebuild request.
