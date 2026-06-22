# PRD: RCL-Staged Extension Garden Planner Integration

## Goal

Replace the current local RCL4+ extension-first heuristic with a road-first staged extension garden planner using the stamp/lattice primitives from P3.

## Scope

- Preserve RCL2/RCL3 bootstrap behavior.
- For RCL4+, pick road-lattice candidates and emit extension sites from serviceable pockets.
- Stage by RCL and construction backlog.
- Return capacity-improving extension decisions before optional road decisions.
- Keep source/controller/storage logistics roads compatible with the garden skeleton.

## Non-Goals

- No built-structure demolition.
- No live deploy without explicit approval.

## Acceptance Criteria

- Focused tests prove road-first lattice behavior, extension serviceability from roads, no orthogonal extension walls, backlog throttles, RCL staging, and RCL8 capacity.
- Existing construction planner tests continue passing.
- `pnpm check` passes before any deployment consideration.
