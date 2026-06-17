# ECS-inspired data-driven decision architecture

## Problem

The project currently uses a thin `runtime` boundary, explicit `kernel` orchestration, and pure domain planners that transform snapshots into decisions. This has worked for early construction, spawning, defense, and intel slices, but future logistics, remote mining, pathing, and multi-intent creep behavior will need cross-domain information without collapsing into a large `Manager` / `Role` / `Overseer` architecture.

The user wants to discuss and establish an ECS-like, data-driven decision architecture with local Codex and Hermes before implementation. The plan must clarify vocabulary, naming, specs, docs, and code cleanup boundaries.

## Goal

Reach an agreed architecture plan for a typed, data-driven Screeps bot model:

```text
runtime captures live Screeps objects into immutable snapshots
-> pure systems read typed component-like facts
-> systems emit typed decisions / intents / requests
-> resolver handles conflicts
-> runtime executes final side effects
```

## Initial constraints

- Do not introduce a full ECS framework or generic query DSL without a separate approved spike.
- Do not rewrite all existing planners in one task.
- Preserve the current runtime/kernel/domain boundaries.
- Prefer `ECS-inspired` terminology: `WorldSnapshot`, component-like facts, pure systems, typed outputs, and explicit resolvers.
- Keep Screeps CPU and testability constraints first-class.
- Task planning must be discussed with the user and local Codex before implementation.

## Discussion questions

1. Should `WorldSnapshot` become a single cross-domain input model now, or should each domain continue owning narrow snapshots until a resolver task needs a shared model?
2. Which names should be standardized: `Snapshot`, `WorldSnapshot`, `Entity`, `Component`, `System`, `Decision`, `Intent`, `Request`, `Resolver`?
3. Should code use `System` suffix (`planConstructionSystem`) or preserve domain verbs (`planRoomConstruction`) while documenting them as systems?
4. Where should cross-domain outputs live: `src/kernel/`, `src/colony/`, a future `src/intents/`, or domain-owned contracts?
5. What is the smallest code cleanup that improves naming without changing live behavior?

## Expected task train after discussion

Likely child tasks, subject to Codex/user discussion:

1. Architecture specs/docs update: add a data-driven decision architecture spec, update `domain-boundaries.md`, `runtime/index.md`, `docs/architecture.md`, and naming guidance.
2. Naming contract cleanup: align interfaces and variables around `Snapshot`, `Decision`, `Intent`, `Request`, `Resolver`, without behavior changes.
3. Minimal intent/resolver foundation: introduce a small creep intent conflict resolver only when a concrete behavior requires it.
4. Optional world snapshot spike: evaluate whether a shared `WorldSnapshot` helps or overgeneralizes current small domain slices.

## Acceptance criteria for this planning task

- Local Codex has independently reviewed the current repo/specs and returned an architecture planning opinion.
- The user has reviewed the proposed task train before implementation starts.
- `design.md` records the agreed architecture vocabulary and explicit non-goals.
- `implement.md` breaks work into bounded child tasks with verification gates.
- Context manifests are curated for later subagent/Codex handoff.
