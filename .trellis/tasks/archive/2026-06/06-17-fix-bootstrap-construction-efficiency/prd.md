# Fix bootstrap construction efficiency

## Goal

Fix two related bootstrap construction inefficiencies observed in the live room:

1. Workers with partial energy switch back to harvesting immediately after one build tick.
2. Road construction is spread across many disconnected sites instead of progressing source-first along a contiguous frontier.

The fix should make early RCL2 construction visibly and mechanically efficient without introducing a full base planner, role framework, or generic ECS layer.

## Problem Statement

### Worker build/harvest oscillation

Current worker planning treats any worker with `freeCapacity > 0` as a harvesting worker. A one-`WORK` worker spends only 5 energy per `build` tick, so after building once it has free capacity again and immediately walks back to harvest. This wastes most ticks on movement and makes construction progress extremely slow.

Required behavior is hysteresis:

```text
harvesting mode: keep collecting until full
working mode: keep spending energy until empty
```

### Road/site fan-out

Current early logistics road behavior can create a large construction-site backlog across multiple routes. Live read-only status showed:

```text
constructionSites=47
constructionProgress=2650/43800
workerCount=5
hostiles=0
cpuBucket=10000
```

The room is healthy, but construction work is fragmented. Road construction should prioritize source-side logistics benefit and complete contiguous route segments instead of scattering sites.

### Source-local build target selection

After source-side construction sites exist, worker build decisions are still room-global. Workers are already assigned to sources for harvesting, but the construction-site selector does not use that assignment when choosing build targets. In a two-source room this can make workers from both source assignments converge on the same source-side container/road frontier, leaving the other source-side logistics route underbuilt.

The desired behavior is local: when a working worker has an assigned source and source-local construction exists near that source, it should prefer that source's container/road frontier before equivalent sites near the other source. If its assigned source has no useful local construction, the worker may fall back to the room-global bootstrap priority.

### Container mining-slot concern

Source-adjacent containers do not reduce mining positions: Screeps containers are walkable and are not part of `OBSTACLE_OBJECT_TYPES`. A creep can stand on a container and harvest. Therefore this task does not need to move containers away from source-adjacent mining tiles. The remaining issue is construction labor locality, not container passability.

## Requirements

- Preserve current survival priorities:
  - emergency spawning and controller downgrade guard remain more important than ordinary construction;
  - spawn/extension refill remains before ordinary build;
  - critical supported repair remains before ordinary build.
- Worker construction behavior must use explicit energy-mode hysteresis rather than `freeCapacity > 0` as the only collection trigger.
- Partial-energy workers in working mode must continue build/repair/refill/upgrade until energy reaches zero.
- Partial-capacity workers in harvesting mode must continue pickup/withdraw/harvest until full.
- Worker mode persistence must stay inside Screeps runtime/memory boundary; domain planners remain pure and receive typed snapshots.
- Do not add generic `Role`, `Manager`, `Entity`, `Component`, or `System` architecture.
- Road planner must prefer source logistics before controller logistics.
- Road planner must create/advance a contiguous frontier from the source/container anchor side toward spawn, not from spawn outward and not across all routes at once.
- Worker construction-site selection must not rely on arbitrary construction-site id ordering for roads.
- Worker construction-site selection must use the worker's assigned source when choosing between equivalent source-side container/road sites.
- A worker assigned to one source should prefer useful construction near that source over equivalent or higher-progress source-side work near a different source, unless no local source-side target exists.
- Source-adjacent containers may remain on walkable mining tiles; do not add avoid-container-mining-seat logic unless future evidence shows pathing or traffic contention.
- Existing live road backlog must be handled safely: either code must focus the useful source-side frontier despite old sites, or a separate explicit live cleanup/deploy step must be requested before removing existing construction sites.
- Do not deploy, remove live construction sites, write Screeps console state, or mutate live Memory without explicit approval for that operational step.

## Non-goals

- Full base layout planner.
- Dedicated miner/hauler role split.
- Remote mining.
- Tower/rampart/wall planning.
- Complete road network optimization.
- Automatic live cleanup of existing construction sites without user approval.

## Acceptance Criteria

- [ ] Unit tests prove a partial-energy working worker continues building instead of harvesting.
- [ ] Unit tests prove an empty working worker switches to harvesting.
- [ ] Unit tests prove a full harvesting worker switches to working and can build/refill/repair/upgrade according to existing priority rules.
- [ ] Unit tests prove a partial-capacity harvesting worker continues collecting energy.
- [ ] Unit/integration coverage proves worker mode is captured/persisted at the runtime boundary, not hidden inside pure domain logic.
- [ ] Existing refill, downgrade guard, critical repair, build, and upgrade priority tests still pass or are updated to the new explicit mode contract.
- [ ] Construction planner tests prove source route road decisions are generated before controller route decisions.
- [ ] Construction planner tests prove road decisions advance from source/container anchor toward spawn.
- [ ] Construction planner tests prove new road site fan-out is bounded to a small frontier rather than whole-route site creation.
- [ ] Worker construction-site tests prove site selection follows strategic priority for source/container/frontier work and does not sort only by construction-site id.
- [ ] Worker construction-site tests prove two workers assigned to different sources choose source-local build targets instead of converging on one source-side route.
- [ ] Worker construction-site tests prove source-locality beats progressed equivalent source-side work on a different assigned source, with deterministic fallback when the assigned source has no local target.
- [ ] Task documentation records that containers are walkable and do not reduce mining slots.
- [ ] `pnpm vitest run test/unit/creeps/worker-decision.test.ts test/unit/construction/construction-planner.test.ts` passes.
- [ ] `pnpm check` passes.
- [ ] `git diff --check` passes.
- [ ] Before any deployment request, `pnpm status:live:screeps` is captured again and rollback/deploy verification steps are written in the report.
