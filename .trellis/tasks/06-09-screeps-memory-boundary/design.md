# 实现 Memory 边界 Design

## Boundaries

- `src/memory/` owns raw `Memory` decoding, schema version, migration, typed state, and writeback.
- `src/runtime/` owns reading/writing the global `Memory` object.
- `src/kernel/` receives typed state and does not validate raw memory.

## Initial Contract

```typescript
export const SCREEPS_MEMORY_SCHEMA_VERSION = 1;

export interface ScreepsMemoryState {
  readonly schemaVersion: typeof SCREEPS_MEMORY_SCHEMA_VERSION;
}
```

The exact exported operation names will be chosen during implementation, but there must be one complete operation for reading/migrating and one complete operation for writeback.

## Data Flow

```text
global Memory -> runtime boundary -> memory boundary -> typed state -> kernel -> memory writeback
```

## Migration Policy

- Missing project root creates the current empty state.
- Current version decodes only if fields match the current contract.
- Future version fails visibly.
- No undocumented legacy migration is accepted.

## Documentation Impact

- `docs/architecture.md` should move Memory from future placeholder to implemented boundary.
- Runtime specs only change if implementation establishes a durable naming or flow convention.
