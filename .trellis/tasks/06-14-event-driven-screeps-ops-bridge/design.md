# Design: Event driven Screeps operations bridge

## Architecture

```text
Screeps runtime console
  -> Screeps websocket user:<accountId>/console
  -> local event bridge process on Bob
  -> JSONL event store + deterministic policy
  -> optional notification / GitHub issue / Hermes wake-up only for actionable events
```

## Event schema

Runtime code should emit structured operations events as single console lines:

```text
[HERMES_EVENT] {"schema":"screeps.ops.event.v1","id":"...","severity":"warning","kind":"worker_below_target","tick":123,"shard":"shard1","room":"W51N21","summary":"...","metrics":{}}
```

Required fields:

- `schema`: `screeps.ops.event.v1`
- `id`: stable event id for dedupe
- `severity`: `info | warning | actionable | critical`
- `kind`: machine-readable event kind
- `tick`: Screeps game tick
- `shard`: shard name
- `summary`: short human-readable summary

Optional fields:

- `room`
- `metrics`
- `recommendedAction`
- `cooldownTicks`

## Bridge responsibilities

1. Load local `screeps.json` through existing credential reader.
2. Read account id through existing live API code.
3. Connect to the Screeps websocket using the local token without printing it.
4. Subscribe initially to:
   - `user:<accountId>/console`
   - `user:<accountId>/cpu`
   - `user:<accountId>/newMessage`
   - `user:<accountId>/set-active-branch`
5. Parse `[HERMES_EVENT]` console lines into validated events.
6. Persist normalized events to a local ignored JSONL store such as `.screeps/events/live.jsonl`.
7. Classify local policy actions:
   - `record`: store only
   - `notify`: deterministic notification without LLM
   - `open_issue`: deterministic GitHub issue template
   - `wake_hermes`: run a bounded Hermes prompt only for reasoning/development
8. Deduplicate by event id/kind/room with cooldown to prevent alert storms.

## Safety boundaries

- The first slice is read-only with respect to Screeps live state.
- The bridge must not upload code, mutate Memory, post console expressions, rollback, or switch branches.
- Tokens must stay in headers/websocket auth messages and never in logs, JSONL, issue bodies, or command arguments.
- Critical in-tick actions remain inside Screeps runtime code. Hermes handles cross-tick operations and development.

## Wake-Hermes path

The low-cost bridge should not call LLM directly for every event. For `actionable`/`critical`, it may call a local command configured by environment, for example:

```bash
SCREEPS_OPS_WAKE_COMMAND='hermes chat -q ... --toolsets terminal,file,github'
```

The payload passed to the wake command must be a redacted JSON event file path, not raw secrets.

## First implementation slice

Start with parser/store/policy and a dry-run CLI. Real websocket connection can be enabled behind a clear command path after tests pass.

## Later slices

- Runtime `emitOpsEvent()` helper and event-producing strategy decisions.
- Deterministic Telegram/GitHub issue actions.
- PM2 process definition.
- Daily summary job reading JSONL without high-frequency LLM calls.
- Optional preauthorized low-risk Memory directive writer.
