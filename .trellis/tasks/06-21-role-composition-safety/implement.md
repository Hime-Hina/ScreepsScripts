# Implementation plan

## RED

1. Add a live-like spawning regression in `test/unit/spawning/spawn-decision.test.ts`:
   - RCL3, full source-container coverage, source-container energy backlog, underfilled spawn/extensions;
   - creeps are surplus miners/upgraders with zero haulers and one expiring surplus role;
   - expected request is `haulerWorker`.
2. Add role body tests:
   - miner spawn decision uses miner-specific body;
   - hauler spawn decision uses carry/move body and can fall back to a 200-energy recovery body.
3. Run focused spawning tests and verify expected failures.

## GREEN

1. Refactor role target selection so missing role gaps are evaluated before replacement requests.
2. Add bounded hauler logistics-outage bypass for `genericTargetGap <= 0`.
3. Split `EARLY_WORKER_BODY_CATALOG` into role-specific catalogs keyed by `SpawnRequestType`.
4. Update existing role body expectations only where they intentionally change.

## VERIFY

Run:

```bash
pnpm vitest run test/unit/spawning/spawn-decision.test.ts
pnpm check
git diff --check
python3 .trellis/scripts/task.py validate 06-21-role-composition-safety
```

Then inspect `git diff` before commit.

## Out of scope

- `pnpm deploy:screeps`
- PM2 bridge restart
- Screeps Memory edits
- console writes
- remote/expansion roles beyond the bounded body catalog change
