# Design: ECS-inspired data-driven decision architecture

## Status

Draft discussed with local Codex and user. Current planning artifacts live on temporary branch `temp/ecs-data-driven-decision-architecture` to avoid polluting `main`.

## User/Codex decisions

- ECS should be mentioned only as a high-level analogy in documentation; code naming should not use generic ECS terms.
- `src/intents/` may be created ahead of the first conflict-heavy behavior, but only as a small typed contract/resolver boundary, not a framework.
- Future world projection remains an open design concept to explain before implementation.
- `UnknownRoomPolicy` should be explained before deciding whether it needs a separate audit task.

## Working architecture thesis

Use a typed data-flow discipline. ECS is only a documentation analogy, not a code vocabulary:

```text
runtime capture -> typed snapshots -> pure planners -> typed outputs -> explicit resolver where needed -> runtime execution
```

## Working vocabulary

| Term | Proposed meaning | Code naming direction |
| --- | --- | --- |
| Snapshot | Immutable captured fact from runtime or a composed read model | Keep existing `*Snapshot` suffix |
| WorldSnapshot | A composed input model for one behavior slice, not necessarily a global ECS store | Use only when a system needs multi-entity or cross-domain facts |
| Entity | Documentation analogy only for stable identity-bearing Screeps objects | Do not use generic `Entity` interfaces; prefer `RoomSnapshot`, `CreepSnapshot`, etc. |
| Component | Documentation analogy only for typed fact clusters | Do not use generic `Component` interfaces; prefer domain names such as `RoomDefenseState` |
| System | Documentation analogy only for pure planners | Do not use `System` suffix; keep domain verbs such as `planRoomConstruction`, `select*`, `score*` |
| Decision | Domain output that runtime can execute or kernel can route | Keep `*Decision` for final or near-final action outputs |
| Intent | Competing action proposal that needs conflict resolution | `src/intents/` may be created early as a small contract/resolver boundary; do not add framework machinery |
| Request | Demand/request queued for a later selector, e.g. spawn request | Keep `*Request` for queued demand models |
| Resolver | Deterministic conflict selector from intents/requests to decisions | Add only beside a concrete conflict class |

## Non-goals

- No wholesale ECS framework.
- No global mutable entity registry.
- No generic query DSL in the first architecture task.
- No immediate rewrite of existing construction/spawning/defense/intel modules solely for naming.
- No live deploy as part of architecture/spec documentation unless later code changes require it and user authorizes deploy.

## Open points for Codex/user discussion

1. Whether future world projection should remain docs/ADR-only in this train.
2. Whether `src/colony/` should own cross-domain strategic demand or only room-level economy/recovery.
3. Which current names are actively misleading and worth cleanup now.
4. Whether `UnknownRoomPolicy` deserves a separate audit task.
