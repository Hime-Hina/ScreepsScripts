# Implementation Plan

## Slice 1: deterministic local core

1. Add event parser module.
   - Parse only `[HERMES_EVENT] <json>` lines.
   - Validate required schema fields.
   - Reject malformed events with non-secret diagnostics.
   - Tests: valid event, ignored normal console line, malformed JSON, unsupported schema, invalid severity.

2. Add JSONL store module.
   - Append normalized events to `.screeps/events/live.jsonl` by default.
   - Create parent directory automatically.
   - Tests: append one event, append multiple events, output is newline-delimited JSON.

3. Add deterministic policy module.
   - `info` -> `record`.
   - `warning` -> `record` or `notify` depending on kind/cooldown.
   - `actionable` -> `wake_hermes` after dedupe/cooldown.
   - `critical` -> `notify` + `wake_hermes`.
   - Tests: classification and cooldown/dedupe.

4. Add dry-run CLI entry point.
   - Accept an input line/file and output redacted policy decision.
   - No real Screeps API call in dry-run mode.
   - Tests: CLI dry-run behavior through public module function; avoid brittle subprocess unless needed.

## Slice 2: websocket bridge

1. Reuse existing live config reader and account identity reader.
2. Connect to Screeps websocket with global `WebSocket`.
3. Subscribe to console/cpu/message/branch channels.
4. Feed console messages through Slice 1 parser/store/policy.
5. Add reconnect/backoff and heartbeat handling.

## Slice 3: runtime event emission

1. Add `emitOpsEvent()` at runtime logging boundary.
2. Emit only state changes or cooldown-gated events.
3. Start with existing actionable states:
   - critical runtime action failure
   - hostile near core
   - worker population below safe threshold
   - CPU bucket persistent low
   - spawn stalled/no workers
4. Tests must verify public runtime output, not private helper calls.

## Slice 4: operations integration

1. Add docs for PM2 startup.
2. Add deterministic notification or GitHub issue template action.
3. Add daily summary job that reads JSONL and uses a single scheduled Hermes run.
4. Add optional wake-Hermes command with redacted payload file path.

## Validation commands

```bash
pnpm test:unit
pnpm test:integration
pnpm check
```

No live deployment in this task unless separately approved.
