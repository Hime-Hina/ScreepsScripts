# Runtime Boundaries

## Entrypoint

`src/main.ts` stays thin:

- Import the complete operation.
- Capture the Screeps runtime boundary.
- Call the operation from `loop`.

Current reference:

- `src/main.ts` calls `runScreepsTick(captureScreepsTickRuntime())`.

Do not put strategy decisions, memory schema parsing, spawn planning, pathfinding, or deployment logic in `src/main.ts`.

## Global Access

Direct access to Screeps globals belongs in `src/runtime/`.

Current reference:

- `src/runtime/screeps-runtime.ts` reads `Game.time`, `Game.cpu.getUsed()`, `Game.creeps`, `Game.spawns`, owned rooms, room structures, construction sites, terrain, `Memory`, `RESOURCE_ENERGY`, Screeps find/structure constants, and `console.log`.
- `src/kernel/run-tick.ts` receives `ScreepsTickRuntime` and does not read globals.

When adding a Screeps global, expose only the smallest operation needed by the runtime interface. Avoid passing raw global objects inward when a narrower method or value preserves the invariant.

## Internal Contracts

Validate external inputs once at the boundary:

- Screeps globals and console behavior in `src/runtime/`.
- `Memory` deserialization at the memory boundary.
- Future deployment configuration at deployment script entrypoints.

After the boundary establishes an invariant, internal modules trust it. Repeated null, type, or state checks inside `src/kernel/` or strategy modules indicate the boundary is wrong.

### Spawn / Extension Energy Capacity

Spawn and extension energy capacity snapshots are structure-level invariants owned by the runtime boundary.

Use Screeps capacity constants when building `SpawnExtensionEnergySnapshot` and spawn snapshots:

```typescript
const spawnCapacity = SPAWN_ENERGY_CAPACITY;
const extensionCapacity = EXTENSION_ENERGY_CAPACITY[room.controller?.level ?? 0];
```

Do not use `store.getCapacity(RESOURCE_ENERGY)` to establish these invariants for `StructureSpawn` or `StructureExtension`. Live Screeps can report `null` from the store call while a newly completed extension enters the room snapshot, but the structure type and controller level still define the capacity the kernel needs.

Required regression coverage:

- Integration test through `loop()` with a spawn and extension whose stores return `null` capacity.
- Assertion that the heartbeat still reports combined room capacity, for example `spawnEnergy=300/350` at RCL2.

## Ownership

Put complexity where the decision is owned:

- Tick orchestration belongs in `src/kernel/`.
- Screeps API capture belongs in `src/runtime/`.
- Spawn decisions belong in `src/spawning/`; room, creep, logistics, and combat decisions belong in future domain modules named after those Screeps concepts.

Forbidden module names include `utils`, `helpers`, `manager`, `handler`, and other context-dependent names.

## Comments

Comments are required for complex algorithms when they document:

- The invariant the algorithm preserves.
- Screeps-specific external constraints such as CPU, action priority, simultaneous action resolution, or object lifetime.
- Non-obvious algorithm phases such as planning, scoring, reservation, and execution.
- A rejected simpler approach and why it would break.

Do not use comments to narrate obvious statements or compensate for vague names.
