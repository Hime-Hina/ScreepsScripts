# PRD: Room Geometry Snapshot and Visual Layout Simulator

## Goal

Create a read-only room geometry and visualization workflow for W51N21 so aggressive road-lattice candidates can be reviewed before implementation or live migration.

## Scope

- Use Screeps API readback to capture terrain, existing structures, construction sites, controller/source/mineral positions, roads, containers, and rampart/wall constraints.
- Render compact ASCII/coordinate maps showing existing core, roads, extension sites, proposed lattice, and blocked terrain.
- Compute metrics: extension count by range, refillAccess min/low count, road connectivity, construction backlog, capacity impact.

## Non-Goals

- No planner integration.
- No live console write, site removal, Memory write, deploy, or PM2 restart.

## Acceptance Criteria

- Produces a human-readable candidate map suitable for user confirmation.
- Has deterministic output for fixture snapshots.
- Does not require live write privileges.
