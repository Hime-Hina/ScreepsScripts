# Screeps Runtime Guidelines

These rules apply to project-owned TypeScript under `src/`.

## Pre-Development Checklist

- Read `docs/architecture.md` and `CONTEXT.md`.
- Search `references/screeps-docs/` before relying on remembered Screeps API behavior.
- Confirm the behavior slice is observable through `loop`, a runtime boundary, or a public module interface.
- Check `docs/game-state.md` before using room, shard, spawn, branch, or production assumptions.

## Guides

| Guide | Applies When |
| --- | --- |
| [Runtime Boundaries](./runtime-boundaries.md) | Adding or changing tick flow, Screeps globals, or runtime adapters |
| [Memory Schema](./memory-schema.md) | Reading or writing Screeps `Memory` |
| [Domain Boundaries](./domain-boundaries.md) | Adding room, colony, spawn, creep, logistics, pathing, defense, or market behavior |
| [CPU and Performance Budget](./cpu-budget.md) | Adding pathfinding, room scanning, caching, throttling, or CPU-sensitive logic |
| [TypeScript Rules](./typescript-rules.md) | Adding source, test, config, generated, or WASM-related code |
| [Diagnostics](./diagnostics.md) | Logging, error visibility, CPU telemetry, or production debugging |

## Required Local Shape

- `src/main.ts` is the only Screeps entrypoint and exports `loop`.
- `src/runtime/` owns direct reads from Screeps globals such as `Game` and `console`.
- `src/kernel/` owns tick-level orchestration and receives explicit runtime inputs.
- Raw Screeps `Memory` must be decoded, migrated, and written through a single boundary owner before internal modules use it.
- New strategy modules are added only for an accepted behavior slice and must not recreate the deleted role-folder design without a new ADR.

## Quality Check

Run the focused test for the behavior slice, then run:

```powershell
pnpm typecheck
pnpm lint
pnpm test:unit
pnpm test:integration
```

Use `pnpm check` before reporting a development task complete.
