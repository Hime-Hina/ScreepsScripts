# Implementation Plan

1. Add RED tests around RCL4+ road-first lattice decisions.
2. Integrate P3 candidate generation/scoring into `planRclExtensionSites` or a new pure helper called from it.
3. Preserve extension-before-road ordering and backlog gating.
4. Run focused planner tests, broader construction/runtime tests, `pnpm check`, and `git diff --check`.
5. Stop for user design/deploy confirmation before live operations.
