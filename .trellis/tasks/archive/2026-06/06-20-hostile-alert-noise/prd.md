# Tune transient hostile alert severity

## Goal

Reduce noise from brief `hostile_present` observations in W51N21: transient scouts or pass-through hostiles should be recorded and visible in ops logs without immediately sending critical Telegram notifications or waking Hermes.

## Requirements

- Preserve critical alerts for room-loss risk signals: controller downgrade critical, zero/no workers, runtime critical failures, and other existing critical events.
- A single `hostile_present` runtime event should no longer trigger both `notify` and `wake_hermes` by default.
- Transient hostile observations should still be persisted by the ops bridge so repeated windows remain auditable.
- The bridge should treat legacy `hostile_present` critical events that lack core-threat metrics as transient/record-only, so noise is reduced after a bridge restart even before the next game-code deploy.
- Hostile events should still be surfaced at a non-critical level so future summary/triage can see them.
- Keep the fix surgical: prefer alert classification/policy changes over defense strategy changes, Screeps Memory writes, console commands, or live game mutations.
- Do not deploy game code unless explicitly authorized; restarting the ops bridge is allowed after local verification because this task changes monitoring behavior.

## Acceptance Criteria

- Tests prove `hostile_present` is record-only or warning-level and does not select `notify`/`wake_hermes` critical actions.
- Tests prove unrelated critical events still select `notify` and `wake_hermes`.
- Focused ops/runtime alert tests pass.
- `pnpm check`, `git diff --check`, and Trellis validation pass.
- If bridge code changes affect the running PM2 process, restart PM2 and verify it is online with current code.
