# Parallel construction workforce for active build backlog

## Goal

Allow multiple full-energy bootstrap workers to build the same eligible construction site in the same tick when no higher-priority survival, refill, downgrade, or critical-repair work needs them.

This improves throughput for single-site or low-site-count backlogs such as the last RCL2 extension, future source/controller containers, and early RCL3 tower/extension construction, without adding new runtime configuration or live-state writes.

## Current Evidence

- Live room `shard1 / W51N21` is healthy: `status=normal`, `workerCount=5`, `hostiles=0`, `roomHealthy`, CPU bucket `10000`.
- Current RCL2 backlog is a single extension site at `35,22`, recently observed near completion (`2885/3000`).
- Current worker decision code reserves construction site ids per tick, so after one worker selects a site, later eligible workers choose upgrade instead of helping the same site.

## Requirements

- When construction is allowed and all higher-priority work is absent, multiple full-energy workers in the same room may receive `buildConstructionSite` decisions for the same construction site.
- Construction site selection remains deterministic: workers choose the lowest-id eligible same-room site first.
- Existing worker priority order remains unchanged:
  1. refill depleted spawn/extensions
  2. controller downgrade guard
  3. critical repair fallback
  4. build eligible construction site
  5. upgrade controller
- Construction remains blocked when room construction eligibility is deferred for survival or defense.
- Controller warning/recovering keeps one full-energy worker upgrading before build; controller critical keeps every full-energy worker upgrading before build.
- Critical repair target reservations remain unchanged; multiple workers must not be assigned to the same repair target in this slice.
- No new mode, flag, Memory field, console command, deploy step, or live-state mutation.

## Non-Goals

- Road planner, container planner, tower planner, RCL3 extension planner, hauler/miner roles, or base layout planning.
- Estimating construction site remaining progress or reserving build work by energy amount.
- Changing runtime boundary action execution, `Creep.build`, or movement behavior.
- Deploying to live Screeps.

## Acceptance Criteria

- [x] Unit test proves multiple full-energy workers can receive `buildConstructionSite` for the same single construction site in one tick.
- [x] Existing refill, downgrade, critical repair, construction deferral, and deterministic target ordering tests pass.
- [x] Focused worker decision test passes.
- [x] `pnpm check` passes locally.
- [x] Task artifacts document behavior boundary and validation commands.
