# Priority bootstrap spawn requests implementation plan

1. Add request metadata types and focused tests.
2. Split request generation from executable selection.
3. Make `planBootstrapWorkerSpawn()` delegate to the new APIs.
4. Verify current integration/e2e behavior remains green while request tests assert richer ordering.

Verification:

```bash
pnpm vitest run test/unit/spawning/spawn-decision.test.ts test/integration/main-loop.test.ts test/e2e/compiled-loop.test.ts
pnpm check
git diff --check
python3 ./.trellis/scripts/task.py validate 06-18-priority-bootstrap-spawn-requests
```
