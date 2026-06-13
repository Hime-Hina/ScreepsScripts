# Implement event driven Screeps operations bridge

## Goal

Add a low-cost, event-driven operations path so Hermes can monitor and participate in Screeps operations without high-frequency LLM polling.

## Requirements

- Introduce a deterministic Screeps event bridge that can run continuously on Bob under PM2.
- Subscribe to Screeps websocket channels instead of polling live status on a short interval.
- Treat console lines prefixed with `[HERMES_EVENT]` as structured operations events.
- Persist received events locally as JSONL for later summaries, replay, and issue evidence.
- Apply local, deterministic policy first; only wake Hermes/LLM for actionable or critical events that require reasoning or development.
- Never print or persist Screeps tokens, passwords, cookies, or full credential files.
- Keep live-affecting actions out of the first implementation slice; no deploy, rollback, Memory mutation, console command, or active branch change from the bridge in this task.
- Keep existing `pnpm status:live:screeps` available as a manual/diagnostic read-only command.

## Non-goals

- No autonomous live deploy or rollback.
- No high-volume room websocket subscription in the first slice.
- No replacement for in-tick Screeps autonomy such as safe mode, emergency spawn, or CPU survival mode.
- No LLM call on every event.

## Acceptance Criteria

- [ ] A documented operations bridge entry point exists under `scripts/screeps/` or `scripts/ops/`.
- [ ] Unit/integration tests cover structured event parsing, secret redaction boundary, event persistence, and policy classification.
- [ ] The bridge can run in dry-run/test mode without real Screeps credentials.
- [ ] Documentation explains PM2 startup, event schema, local persistence path, and wake-Hermes policy.
- [ ] `pnpm check` passes.

## Notes

- Current production room remains `shard1 / W51N21`.
- Current live branch is `main`.
- `screeps.json` and `screeps.ptr.json` are ignored local credential files and must remain untracked.
