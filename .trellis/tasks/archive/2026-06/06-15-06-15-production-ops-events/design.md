# Design: Production-ready structured ops events

## Architecture

```text
Screeps runtime
  -> console.log("[HERMES_EVENT] {...}")                primary channel
  -> Game.notify("[HERMES_EVENT] {...}") for critical   fallback channel

Bob ops bridge / email fallback
  -> parse + validate + redact
  -> persist normalized event JSONL
  -> deterministic cooldown
  -> durable claim ledger by dedupeKey
  -> only claim owner may notify/wake Hermes
```

## Runtime event shape

All runtime ops events use `schema=screeps.ops.event.v1` and the existing `[HERMES_EVENT]` prefix.

Required fields:

- `id`: unique event occurrence id, includes source/kind/tick/shard/room where applicable.
- `dedupeKey`: stable incident key used by bridge/email claim ledger.
- `severity`: `info | warning | actionable | critical`.
- `kind`: snake_case event kind.
- `tick`, `shard`, `summary`.
- `room` when room-scoped.
- `metrics` for structured numbers/strings.
- `recommendedAction` when a human/agent action is meaningful.

Heartbeat uses `kind=runtime_heartbeat`, `severity=info`, and carries room summaries in metrics.

Alert event examples:

- `controller_downgrade_critical` — critical, email fallback allowed.
- `worker_count_low` — critical, email fallback allowed.
- `spawn_energy_low` — actionable supporting context, no email fallback.
- `hostile_present` — critical, email fallback allowed.
- `runtime_action_failure` — critical only for critical action failures, otherwise actionable.

## Claim ledger

Use a local file ledger under `.screeps/ops-claims/` by default. Claim creation must be atomic:

1. Compute a filesystem-safe claim filename from `dedupeKey` using SHA-256.
2. `open(path, 'wx')` to create only if absent.
3. On success, write owner/source/event metadata.
4. On `EEXIST`, read existing owner metadata and mark duplicate.

Only decisions with active actions beyond `record` attempt claims. If a duplicate is found, active actions are removed, `suppressed=true`, and the summary records `duplicate=true` / `claimOwner`.

## Email fallback boundary

Add a script-level boundary rather than wiring Hermes gateway directly in this repo:

```bash
pnpm ops:event-email-fallback:screeps -- --event-line '[HERMES_EVENT] {...}' --claim-store-default
```

The script returns a deterministic summary:

- `fallback=claimed` means email was first owner and may issue a critical fallback notification.
- `fallback=duplicate` means console bridge or another channel already owns the event; email must not wake another Hermes session.
- `fallback=ignored` means body has no structured event or non-critical event.

Current Hermes email gateway should keep `skip_agent=true` for Screeps email so email does not start a parallel Hermes session by default. If we later wire gateway code directly, it should call this script/ledger before delivering or waking.

## Rollout compatibility

`status:live:screeps` should prefer structured heartbeat events and may retain legacy `[tick ...]` parsing during the rollout window. Runtime output itself should migrate to structured events.

## Verification

- RED/GREEN unit tests for runtime heartbeat and alert event output.
- Parser/claim ledger tests for duplicate console/email paths.
- Live status parser test for structured heartbeat.
- Focused script tests, then `pnpm check`.
- Bounded live smoke after code is deployed: `pnpm status:live:screeps` and `pnpm ops:event-bridge:screeps -- --shard shard1 --max-console-updates 1 --timeout-ms 30000 --max-reconnects 1 --store-default`.
- PM2 restart smoke after merging/deploying the bridge changes.
