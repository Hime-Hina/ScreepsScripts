# Design: Rollout Rehearsal

## Rehearsal Sequence

1. Render candidate layout and migration diff.
2. Run focused tests and `pnpm check` on implementation branch.
3. Request read-only review from an independent agent.
4. Present concise operator packet:
   - selected candidate map;
   - structures/sites to add/remove;
   - expected capacity impact;
   - stop/rollback conditions.
5. Only after explicit approval: deploy, verify readback, optionally run approved console cleanup, restart bridge, and short monitor.

## Stop Conditions

- live status not normal;
- heartbeat not verified;
- hostiles present;
- refillAccess below accepted threshold;
- construction progress stalls after migration;
- unexpected runtime_action_failure events;
- PM2 bridge unstable.
