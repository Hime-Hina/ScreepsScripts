# P3 implementation plan

1. Extend spawn room snapshots with optional source/controller/storage energy buffers.
2. Capture those buffers in `screeps-runtime`.
3. Replace static role target selection with bounded target formulas and role-specific TTL gap.
4. Add unit tests in `test/unit/spawning/spawn-decision.test.ts`.
5. Run focused spawn tests, `pnpm check`, and Trellis validation.
