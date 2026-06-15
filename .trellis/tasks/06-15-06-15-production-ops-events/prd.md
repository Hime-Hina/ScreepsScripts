# Production-ready structured ops events

## Goal

Make Screeps operations monitoring production-ready by making structured console events the primary event stream, keeping `Game.notify` email as a critical fallback, and adding a deterministic claim ledger so console and email paths cannot both trigger independent Hermes responses for the same incident.

## Requirements

- Runtime console output must use `[HERMES_EVENT]` JSON lines for tick heartbeat/operations diagnostics; the runtime should no longer emit the legacy plain `[tick ...]` heartbeat.
- Runtime heartbeat events must include schema, stable kind, tick, shard, summary, CPU snapshot, budget, and per-room worker/energy/construction/hostile metrics.
- Runtime alert decisions must have structured event metadata: id, dedupe key, severity, kind, shard, optional room, summary, metrics, and recommended action.
- `Game.notify` remains only a fallback for critical survival/runtime incidents and must carry the same structured event line/id/dedupe key as the console event.
- Event bridge must keep deterministic parse/validate/redact/persist/cooldown behavior and add a durable claim ledger for active actions.
- Only the first channel that claims an active dedupe key may notify or wake Hermes. Later console/email duplicates must be recorded as duplicates/suppressed.
- Add an email fallback CLI path that can parse a `Game.notify` body containing `[HERMES_EVENT]`, attempt the same claim, and report whether the email fallback should notify or suppress.
- Keep live Screeps mutation out of the bridge: no deploy, rollback, Memory mutation, console expression, or branch switching.
- Update status/live smoke code to read structured runtime heartbeat; legacy heartbeat parsing may remain only as backward compatibility during rollout.
- Update documentation for the primary console bridge + email fallback architecture and PM2/gateway operational boundary.

## Acceptance Criteria

- [x] Unit test proves `runTick` emits structured heartbeat and no plain `[tick ...]` heartbeat.
- [x] Unit test proves runtime alerts emit structured ops events and critical `Game.notify` fallback carries the same structured event id/dedupe key.
- [x] Unit/integration test proves `status:live:screeps` can parse structured heartbeat events.
- [x] Unit test proves console bridge and email fallback sharing the same dedupe key produce only one active owner via the claim ledger.
- [x] Unit test proves duplicate email fallback suppresses notify/wake when console already claimed the event.
- [x] Focused tests for kernel/runtime ops events and screeps-ops scripts pass.
- [x] `pnpm check` passes before PR.
- [ ] Bounded live bridge smoke and PM2 restart smoke are run after implementation and before deployment/merge decisions. Bounded read-only live smoke passed; PM2 restart is intentionally deferred until explicit deploy/restart approval.

## Non-goals

- Do not implement new game strategy, expansion, combat, pathing, or Memory directives.
- Do not make the bridge mutate live Screeps state.
- Do not change Hermes core gateway behavior in this PR unless a separate reviewed patch is explicitly required; provide a stable CLI boundary for email fallback integration.

## Current baseline

- PR #7 has been merged into `main` as commit `9ff5f93`.
- Current live Screeps runtime hash before this task is `a377f8224694f70ae6c75481a75b14a6bf5f62405edea0c1f517e24f5e9d4dde` from PR #9.
- `screeps-ops-event-bridge` is already running under PM2 on Bob; this task must make that shape restartable from `main` and safe against email duplicates.
