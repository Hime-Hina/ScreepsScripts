# Memory Schema

## Scenario: Persistent Screeps Memory

### 1. Scope / Trigger

This contract applies before any project-owned code reads or writes Screeps `Memory`.

`Memory` is long-lived production state. Treat it as an external input boundary, not as trusted internal data.

### 2. Signatures

Memory boundary exposes complete operations with this shape:

```typescript
export const SCREEPS_MEMORY_SCHEMA_VERSION = 1;

export interface ScreepsMemoryState {
  readonly schemaVersion: number;
}

export const readScreepsMemoryState = (rawMemory: unknown): ScreepsMemoryState => {
  // validate and migrate at the boundary
};

export const writeScreepsMemoryState = (
  rawMemory: unknown,
  state: ScreepsMemoryState,
): void => {
  // write typed state back to Memory
};
```

Current implementation lives in `src/memory/screeps-memory.ts`. The ownership must not change: one boundary module owns raw `Memory` validation, migration, and typed projection.

The schema version constant belongs to the memory boundary module. Domain modules import typed state and must not define private schema-version constants.

### 3. Contracts

Required memory contract:

- Store a schema version.
- Validate raw memory once at the boundary.
- Migrate from previous documented versions to the current typed state.
- Pass only typed state into kernel and strategy modules.
- Write through a single owner that preserves the schema version.
- Own top-level memory root naming in one place.
- Own subtree contracts for project state such as creeps, rooms, spawns, colonies, pathing caches, and operations metadata.

Migration is not a scattered compatibility branch. It is an explicit boundary operation from old persisted state to the current invariant.

### 4. Validation & Error Matrix

| Condition | Required Behavior |
| --- | --- |
| Missing memory root | Create current empty state |
| Missing schema version | Migrate only if a documented legacy shape exists; otherwise fail visibly |
| Future schema version | Fail visibly; do not downgrade |
| Invalid field type | Fail visibly or migrate through a documented rule |
| Partial migration | Do not expose partially migrated state internally |
| Dead creep memory | Remove or archive through the memory owner, not creep behavior |
| Stale room cache | Expire through a documented TTL or invalidation rule |
| Missing writeback | Fail the test that asserts persisted state changed |

### 5. Good/Base/Bad Cases

- Good: raw `Memory` is decoded once, migrated to current schema, and strategy code receives typed state.
- Base: no memory usage exists yet; any task requiring memory must first add this boundary.
- Bad: creep logic reads `Memory.creeps[name]` directly and handles missing fields locally.

### 6. Tests Required

Memory changes require:

- Unit tests for decoding valid current memory.
- Unit tests for each supported migration.
- Unit tests for invalid and future versions.
- Unit tests for writeback.
- Unit tests for dead creep and stale room/cache cleanup.
- Integration tests proving runtime code does not parse raw memory in multiple places.

### 7. Wrong vs Correct

#### Wrong

```typescript
if (!Memory.creeps[name]) {
  Memory.creeps[name] = {};
}
```

#### Correct

```typescript
const memoryState = readScreepsMemoryState(Memory);
```

## Subtree Ownership

Initial ownership convention:

| Subtree | Owner |
| --- | --- |
| schema root/version | Memory boundary |
| `creeps` | Future creep/domain state owner through memory boundary |
| `rooms` | Future room/colony state owner through memory boundary |
| `spawns` | Future spawning state owner through memory boundary |
| pathing caches | Future pathing owner through memory boundary |
| deployment/ops metadata | Operations tooling, not runtime strategy |

Screeps object memory aliases such as `creep.memory` are allowed only at the runtime boundary or a domain operation that already receives typed memory state. Do not let every creep behavior define its own persisted shape.

## RawMemory and Segments

Do not use `RawMemory`, memory segments, or `InterShardMemory` until an ADR accepts the added operational complexity and the memory boundary has tests for that API.
