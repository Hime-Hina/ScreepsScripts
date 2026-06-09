# Shared Thinking Guides

Use these guides when a Screeps behavior touches multiple boundaries or starts to repeat.

## Available Guides

| Guide | Use When |
| --- | --- |
| [Code Reuse Thinking Guide](./code-reuse-thinking-guide.md) | A behavior repeats room, creep, spawn, pathfinding, memory, or config logic |
| [Cross-Layer Thinking Guide](./cross-layer-thinking-guide.md) | A behavior crosses `src/main.ts`, `src/runtime/`, `src/kernel/`, future strategy modules, tests, docs, or deployment |

## Screeps Triggers

Read the cross-layer guide before changing:

- Runtime global capture.
- `Memory` schema.
- Deployment branch or credentials flow.
- Creep action ordering.
- Room, spawn, source, mineral, or route assumptions.
- A behavior that requires unit plus integration or e2e coverage.
- CPU or bucket behavior that changes how often work is performed.

Read the code reuse guide before adding:

- A generic module name.
- A second copy of body-building, path scoring, target selection, room scanning, or memory parsing logic.
- A new constant or config value used in more than one module.

## Pre-Modification Search

Before changing a constant, config value, Screeps API call, or game-state assumption, search first:

```powershell
rg "value_to_change"
rg "Game.cpu" references\screeps-docs
```

Do not make a local change that contradicts `docs/game-state.md` blocked facts.

## Completion Trigger

Before finishing a task, check [Completion Definition](../testing/completion-definition.md). A passing test run is not enough when docs, specs, ADRs, or live verification are stale.
