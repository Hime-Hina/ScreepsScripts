# Design

## Boundary

The live bridge is a local Node.js operations command. It reads `screeps.json`, calls read-only Screeps account identity API, and opens the official console SockJS websocket. It does not call write-code APIs or submit console expressions.

## Modules

- `scripts/screeps/ops-event.mjs`: existing parser, redaction, JSONL persistence, and policy decision core.
- `scripts/screeps/ops-event-bridge-dry-run.mjs`: dry-run command and exports moved out of the live bridge entrypoint.
- `scripts/screeps/screeps-console-websocket.mjs`: websocket URL/frame/auth/subscribe helpers used by the live bridge.
- `scripts/screeps/ops-event-bridge.mjs`: live loop, reconnect policy, event limit/timeout, store path, and decision printing.

## Data flow

```text
read screeps.json -> auth/me account id
  -> websocket auth + subscribe user:<accountId>/console
  -> console update messages.log lines
  -> parseOpsEventLine
  -> appendOpsEventToJsonl (optional)
  -> decideOpsEventActions
  -> stdout decision JSON
```

## Safety

- Token is sent only in websocket `auth <token>` message and API `X-Token` header.
- Errors and stdout must not include token or remote module source.
- `--max-events`, `--timeout-ms`, `--max-reconnects`, and `--reconnect-delay-ms` make live smoke runs bounded without changing live Screeps state.
