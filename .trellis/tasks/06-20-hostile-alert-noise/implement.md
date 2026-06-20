# Tune transient hostile alert severity implementation plan

## RED

1. Add or update a runtime alert test proving `hostile_present` is emitted as `warning` instead of `critical`.
2. Add or update an ops-event policy test proving `warning` events are record-only while critical events still notify and wake Hermes.

## GREEN

1. Change the hostile-present alert classification in the pure runtime alert selection layer.
2. Add bridge-policy compatibility for legacy `hostile_present` critical events that do not carry core-threat metrics.
3. Leave bridge claim/dedupe and hook execution unchanged so non-critical/transient events are persisted but do not trigger external side effects.

## Verification

```bash
pnpm exec vitest run test/unit/kernel/runtime-alerts.test.ts test/unit/screeps-ops/ops-event.test.ts
pnpm check
git diff --check
python3 ./.trellis/scripts/task.py validate 06-20-hostile-alert-noise
```

If PM2 bridge behavior depends on changed local scripts or emitted event severity, restart `screeps-ops-event-bridge` after commit and verify `pm2 describe` plus `pnpm status:live:screeps`.
