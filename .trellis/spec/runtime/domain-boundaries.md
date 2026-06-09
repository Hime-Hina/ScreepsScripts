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
| Initial spawning decision | `src/spawning/` |

## Future Owners

Use these boundaries when the behavior exists:

| Domain | Owns | Does Not Own |
| --- | --- | --- |
| Colony | Room-level goals, resource priorities, high-level work allocation | Raw Screeps globals |
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
