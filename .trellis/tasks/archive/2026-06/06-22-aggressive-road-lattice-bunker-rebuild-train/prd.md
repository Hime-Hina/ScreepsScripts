# PRD: Aggressive Road-Lattice Bunker Base Rebuild Train

## Goal

Plan a more aggressive mature-bot-inspired base layout path for W51N21 and future rooms. The target is not another local tweak to extension placement; it is a road-first lattice / bunker-stamp planning train with explicit research, simulation, staged construction, migration gates, and live rollout review.

## User Intent

The user approved creating parent/child tasks and allowed a more aggressive design direction, after clarifying that implementation design should be confirmed before code changes. This parent task tracks the roadmap only. Child tasks may produce plans, research, code, tests, or rollout artifacts, but any destructive live operation remains gated.

## Child Task Train

| Phase | Child task | Purpose |
|---|---|---|
| P1 | `06-22-mature-bunker-layout-survey` | Survey mature Screeps bunker / base-planner patterns and translate concepts into local constraints. |
| P2 | `06-22-room-geometry-layout-simulator` | Produce a read-only room geometry snapshot and visual candidate layout output for W51N21. |
| P3 | `06-22-road-lattice-stamp-primitives` | Add pure stamp/lattice primitives, transforms, connectivity and scoring. |
| P4 | `06-22-rcl-staged-extension-garden-planner` | Integrate road-first staged extension garden planning into construction planner. |
| P5 | `06-22-aggressive-core-migration-safety-gates` | Design optional aggressive migration of existing core/extension structures behind explicit operator gates. |
| P6 | `06-22-layout-rollout-rehearsal-monitoring` | Prepare dry-run rollout, human review artifacts, deploy gate checklist, and monitoring loop. |

## Scope

- Use mature bot/layout research as design evidence, not as code to copy.
- Prefer a road skeleton / lattice first, then extension pockets around roads.
- Support aggressive future migration, including possible core relocation, but only as a staged plan with capacity, safety and user confirmation gates.
- Preserve current live-room safety: no automatic built-structure destruction, branch switch, deploy, Screeps Memory write, or console write from these planning tasks.

## Acceptance Criteria

- Parent and all child tasks exist and are linked in Trellis.
- Each child has `prd.md`, `design.md`, `implement.md`, `implement.jsonl`, and `check.jsonl` with no placeholder-only context.
- The task train makes design confirmation gates explicit before implementation and before live operations.
- `task.py validate` passes for the parent and every child.
- `task.py list` shows the expected hierarchy.
