# Data-driven Decision Architecture

## Purpose

This project uses a typed, data-driven decision architecture:

```text
runtime capture -> typed snapshots -> pure planners -> typed decisions / requests / intents -> explicit resolver where needed -> runtime execution
```

ECS is only a high-level analogy for this data flow. Do not introduce generic `Entity`, `Component`, or `System` code names. Screeps domain names remain the code vocabulary.

## Required Naming

| Name | Use for | Do not use for |
| --- | --- | --- |
| `*Snapshot` | Immutable facts captured by `src/runtime/` or composed by a narrow read model | Mutable state or live Screeps objects |
| `*WorldSnapshot` | The complete input root for one planner or scoring operation | A global mutable world store |
| `*Decision` | A domain output that runtime can execute directly or kernel can route | A tentative proposal that still needs conflict resolution |
| `*Request` | Queued demand that an owner must select from or translate later | Unrelated options/mode bags |
| `*Intent` | A competing proposal for the same actor/resource that needs resolver selection | Ordinary single-owner planner output |
| `resolve*` | Deterministic conflict selection from intents/requests to decisions | Hidden strategy decisions or Screeps API execution |

Documentation may use ECS terms as an analogy:

- entity-like facts: room, creep, spawn, source, structure, remote room;
- component-like facts: position, energy, body, controller, hostile risk, construction backlog;
- system-like functions: pure planners such as `planRoomConstruction`, `planRoomDefense`, and `scoreRemoteMiningCandidates`.

Production TypeScript must prefer project/domain names instead of generic `Entity`, `Component`, or `System` names.

## Boundary Rules

- `src/runtime/` captures live Screeps globals and executes final Screeps actions.
- `src/kernel/` orchestrates tick order, CPU budget branches, and runtime operation groups.
- Domain modules such as `src/construction/`, `src/spawning/`, `src/creeps/`, `src/defense/`, and `src/intel/` own pure planning/scoring decisions.
- `src/colony/` owns room-level invariants that multiple domains consume, such as economy safety, construction eligibility, recovery state, and high-level demand.
- `src/intents/` owns narrow conflict-resolution contracts when multiple domains may compete for the same creep, spawn, or structure action.

## `src/intents/` Scope

`src/intents/` may exist before the first broad logistics/combat conflict, but it must remain small:

- typed intent records;
- deterministic resolver functions;
- resolver unit tests;
- no Screeps globals;
- no runtime execution;
- no generic ECS registry, query DSL, or scheduler framework.

Current intended shape:

```typescript
CreepIntent<TDecision>
ResolvedCreepIntent<TDecision>
resolveCreepIntents(intents)
```

A domain planner may continue returning direct `*Decision` values while it is the sole owner for an actor. Convert to intents only when another domain can emit a competing proposal for the same actor/resource.

## Future World Projection

A future world projection is a read-only per-tick model that would normalize repeated cross-domain facts, for example:

```text
roomsByName
creepsByRoom
sourcesByRoom
spawnsByRoom
constructionBacklogByRoom
hostileRiskByRoom
spawnCapacityByRoom
remoteIntelByRoom
```

It is not a mutable ECS registry. Add it only after a task proves repeated snapshot composition is causing real duplication or unclear ownership. Until then, keep `*WorldSnapshot` inputs behavior-local.

## Unknown Intel Policy

Small explicit domain policies are allowed when they are typed, local, and tested. For example, `UnknownRoomPolicy = 'exclude' | 'penalize'` belongs to remote-mining intel scoring and is not a general options bag. If such a policy grows additional modes or crosses domain boundaries, split it into a separate design task.

## Wrong vs Correct

### Wrong

```typescript
interface Entity {
  readonly components: Component[];
}

runSystem(world, systemOptions);
```

### Correct

```typescript
const workerDecisions = planBootstrapWorkerActions(workerWorldSnapshot);
const resolvedIntents = resolveCreepIntents(creepIntents);
runtime.executeWorkerActions(workerDecisions);
```

## Verification

Changes to this architecture require:

- focused unit tests for new resolver or planner behavior;
- `pnpm typecheck` for naming/interface changes;
- `pnpm check` before a task is complete;
- documentation updates when a new boundary such as `src/intents/` or future world projection is introduced.
