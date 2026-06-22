# PRD: Road-Lattice Stamp Primitives and Scoring

## Goal

Introduce pure construction-planning primitives for road-lattice / bunker-stamp candidates that can be rotated, reflected, translated, scored, and checked without touching live state.

## Scope

- Define relative-coordinate stamp primitives for roads, extension pockets, core slots, exits, and reserved open diagonals.
- Support rotation/reflection/translation transforms.
- Score candidates by road continuity, serviceability, capacity, open diagonals, terrain fit, existing structure compatibility, and migration cost.
- Keep this isolated from runtime and Screeps globals.

## Non-Goals

- No live room migration.
- No construction planner integration yet; P4 owns integration.

## Acceptance Criteria

- Pure unit tests cover transforms, collision detection, connectivity, refill adjacency, scoring tie-breaks, and invalid numeric/terrain handling.
- Primitives can express both conservative extension gardens and aggressive bunker-like stamps.
