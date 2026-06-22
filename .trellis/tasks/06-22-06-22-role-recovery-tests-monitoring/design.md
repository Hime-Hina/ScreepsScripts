# Design: role recovery tests and monitoring

## Test additions

1. Extend `test/unit/spawning/spawn-decision.test.ts` with the post-builder recovery phase:
   - miner surplus remains;
   - builder target is satisfied;
   - upgrader target is missing;
   - an expiring surplus miner exists;
   - expected first request: `upgraderWorker`.

2. Extend `test/unit/kernel/runtime-alerts.test.ts` with a role composition drift event:
   - role-specific room already exists;
   - miner count materially exceeds source/container target;
   - builder/upgrader gaps exist with storage construction and source-container energy;
   - expected structured event kind: `role_composition_drift`, severity `actionable`, no email fallback.

3. Keep negative coverage for generic-only healthy rooms and stable role mixes.

## Monitoring additions

### Runtime structured event

Add `role_composition_drift` to runtime alerts. It should be actionable but non-email:

- requires role-specific creeps already present;
- requires surplus miners above `min(sourceCount, sourceContainerCount)` by at least 3;
- requires missing hauler, builder, or upgrader target;
- includes role counts, targets, gaps, construction backlog, source container energy, and worker count metrics.

This catches recurrence through the existing PM2 bridge/claim-ledger path.

### Read-only live command

Add `scripts/screeps/role-recovery-status.mjs` and `pnpm status:role-recovery:screeps` for manual/cron diagnostics. It reads:

- `/api/auth/me` for account id;
- `/api/game/room-status`;
- `/api/game/room-objects`;
- `/api/user/memory?path=creeps&shard=<shard>` for authoritative roles;
- `/api/user/code?branch=main` for module hash.

Output is one line with no secrets:

```text
[status:role-recovery:screeps] branch=main shard=shard1 room=W51N21 status=normal moduleHash=... creeps=14 roleCounts=builder:2,hauler:2,miner:9,upgrader:1 spawningRole=- roadCritical=45/45 roadMinHits=200/5000 constructionProgress=8880/30000 sourceContainers=29,6:2000/2000|20,43:2000/2000
```

## Non-goals

- No Memory rewrite.
- No console write operations.
- No new external Hermes cron job unless the user asks for recurring delivery separately.
