# PRD: Aggressive Core Migration Plan and Safety Gates

## Goal

Design a safe operator-gated migration path for moving from the current organic core toward a more aggressive road-lattice/bunker layout, including possible staged replacement of built structures.

## Scope

- Identify which existing structures can remain, which should be avoided, and which could be migrated later.
- Define staged migration gates for construction sites, built extensions, storage, tower, spawn, and roads.
- Produce explicit operator review output before any destructive step.
- Include rollback limitations: code rollback cannot resurrect destroyed structures.

## Non-Goals

- No destructive live action in this task by default.
- No automatic built-spawn/storage/tower/extension destruction.

## Acceptance Criteria

- Migration plan classifies every affected structure as keep, migrate-later, or remove-site-only.
- Built-structure removal requires replacement capacity and explicit user approval.
- GM/console output plan is multi-line and sectioned, not dense key=value dumps.
