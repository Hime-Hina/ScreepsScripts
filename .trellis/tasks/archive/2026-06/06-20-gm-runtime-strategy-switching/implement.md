# Deferred GM runtime strategy switching implementation plan

Do not implement before the RCL3 economy stabilization tasks unless the user explicitly reprioritizes it.

## Future RED tests

- Strategy directives expire after TTL.
- Critical defense/downgrade/survival gates override manual directives.
- Pretty output shows active strategy, expiry, and reason when ignored.
- No unbounded persistent Memory write is introduced.

## Future verification

```bash
pnpm vitest run test/unit/console/gm-console.test.ts test/unit/kernel/run-tick.test.ts test/integration/main-loop.test.ts
pnpm check
git diff --check
python3 ./.trellis/scripts/task.py validate 06-20-gm-runtime-strategy-switching
```
