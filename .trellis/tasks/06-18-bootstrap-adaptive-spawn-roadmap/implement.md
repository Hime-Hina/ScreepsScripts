# Bootstrap and RCL3 economy stabilization roadmap implementation plan

## Order

1. Implement `06-20-rcl3-economy-unblock-accessible-layout` first; it is the current P0 live bottleneck.
2. Run focused tests, `pnpm check`, `git diff --check`, task validation, Codex review, deploy, and live verification before continuing.
3. Implement `06-18-priority-bootstrap-spawn-requests` after P0 proves worker demand and construction recover.
4. Implement TTL replacement only after request target-gap accounting exists.
5. Implement role split only after request model and replacement pressure are stable.
6. Implement tower policy after construction can finish or the tower exists.

## Shared verification gate

```bash
pnpm vitest run test/unit/colony/bootstrap-economy.test.ts test/unit/spawning/spawn-decision.test.ts test/unit/construction/construction-planner.test.ts test/integration/main-loop.test.ts
pnpm check
git diff --check
python3 ./.trellis/scripts/task.py validate <task>
```

For any deploy: `pnpm deploy:screeps`, `pnpm verify:live:screeps`, `pnpm status:live:screeps`, and short live monitoring.
