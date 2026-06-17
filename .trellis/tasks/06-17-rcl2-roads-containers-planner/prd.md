# RCL2 roads and containers planner

## Problem

W51N21 has two sources but no roads or containers. Current structures are only 1 spawn and 5 extensions. Source utilization is limited by generic worker travel/harvest behavior, especially for the distant southern source at `19,43`.

Observed anchors:

- spawn: `35,23`
- controller: `26,7`
- north source: `28,5`
- south source: `19,43`
- mineral: `42,26` (`H`), not relevant until extractor/storage phases

## Goal

Plan and eventually create a minimal RCL2/RCL3-compatible road/container layout that improves energy logistics without overbuilding or blocking survival behavior.

## Dependency

Start after the immediate workforce tasks, unless live evidence shows pathing or source access has become the primary bottleneck.

## Proposed scope

Create a pure planner from room snapshot/terrain evidence that selects candidate tiles for:

- source containers near each source;
- controller container or controller-adjacent staging tile;
- minimal roads between spawn/extensions, controller, and source container candidates.

The first implementation should be conservative and testable. It should not require full base-layout/rampart planning.

## Out of scope

- Tower placement and tower behavior.
- Ramparts/walls/base bunker planning.
- Mineral extraction.
- Dedicated logistics role split, unless a later task explicitly depends on containers.
- Live site creation/deploy unless separately authorized.

## Acceptance criteria

- Planner can run from deterministic room snapshot/terrain inputs in tests.
- Candidate tiles are walkable and within valid ranges for source/controller logistics.
- Existing extension/spawn positions are not overwritten.
- Construction site creation respects existing construction/backlog safety gates.
- `pnpm check` passes.

## Suggested branch

`feat/rcl2-roads-containers-planner`
