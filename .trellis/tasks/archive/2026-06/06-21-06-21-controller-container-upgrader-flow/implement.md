# Controller container upgrader flow implementation plan

1. Add RED tests in `test/unit/creeps/worker-decision.test.ts` for upgrader withdraw/upgrade/fallback and builder build/repair/fallback.
2. Implement `planUpgraderAction` and `planBuilderAction` in `src/creeps/worker-decision.ts` with minimal helper reuse.
3. Run focused worker tests, integration tests, `pnpm check`, `git diff --check`, and task validation.
4. Review, deploy, PM2 restart, live readback, and monitor.
