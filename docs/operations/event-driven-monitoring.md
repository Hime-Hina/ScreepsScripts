# Event-driven Screeps operations

This repository uses an event-driven operations model for Hermes maintenance. The goal is to avoid high-frequency LLM polling while still letting Hermes react to important game events.

## Runtime event line

Screeps runtime code should emit structured operations events as one console line:

```text
[HERMES_EVENT] {"schema":"screeps.ops.event.v1","id":"worker-low-71630000","severity":"actionable","kind":"worker_below_target","tick":71630000,"shard":"shard1","room":"W51N21","summary":"worker count below target","metrics":{"workers":2,"target":3},"cooldownTicks":300}
```

Normal heartbeat lines are still allowed and are ignored by the operations event parser unless they use the `[HERMES_EVENT]` prefix. Whitespace after the prefix is optional, but runtime emitters should use one space before the JSON payload for readability.

## Severity policy

| Severity     | Local decision                                  |
| ------------ | ----------------------------------------------- |
| `info`       | record only                                     |
| `warning`    | record only in the first slice                  |
| `actionable` | record and wake Hermes, cooldown-gated          |
| `critical`   | record, notify, and wake Hermes, cooldown-gated |

The bridge policy is deterministic. It does not call an LLM for every console line.

## Live command

Use the live command to subscribe to Screeps console websocket output and process structured operations events without mutating live game state:

```bash
pnpm ops:event-bridge:screeps -- --shard shard1 --store-default
```

For bounded smoke checks, exit after a console update without requiring a structured event:

```bash
pnpm ops:event-bridge:screeps -- --shard shard1 --max-console-updates 1 --timeout-ms 30000 --max-reconnects 1
```

For bounded event-processing checks, add event/time/reconnect limits:

```bash
pnpm ops:event-bridge:screeps -- --shard shard1 --max-events 1 --timeout-ms 30000 --max-reconnects 1 --store-default
```

The live bridge authenticates with `screeps.json`, subscribes to `user:<accountId>/console`, ignores normal heartbeat lines, and only acts on console lines with the `[HERMES_EVENT]` prefix.

## Dry-run command

Use the dry-run command to test parsing, JSONL persistence, and policy decisions without connecting to Screeps:

```bash
pnpm ops:event-bridge:dry-run:screeps -- --dry-run-line '[HERMES_EVENT] {"schema":"screeps.ops.event.v1","id":"test-1","severity":"critical","kind":"spawn_missing","tick":1,"shard":"shard1","room":"W51N21","summary":"spawn missing"}' --store-default
```

`--store-default` writes to a day-scoped JSONL file under `.screeps/events/` so long-running bridge output is not concentrated in one unbounded `live.jsonl` file.

Expected output shape:

```text
[ops:event-bridge] dryRunEvents=1
[ops:event-bridge] decision={...}
```

## Secret handling

- `screeps.json` and `screeps.ptr.json` remain ignored local files.
- Tokens must never be printed, committed, or sent to Hermes prompts.
- Metric keys containing `token`, `password`, `cookie`, `secret`, or `authorization` are redacted before persistence or policy use.

## Deployment boundary

The first bridge slice is not a deployer. It does not upload code, roll back, mutate Memory, post console expressions, or switch branches. Live-affecting actions require a later task and explicit policy.

## PM2 target shape

The long-running process should be managed by PM2 on Bob, for example:

```bash
pm2 start scripts/screeps/ops-event-bridge.mjs --name screeps-event-bridge -- --shard shard1 --store-default
```

Run a bounded smoke command before PM2 promotion so a missing token, websocket auth failure, or reconnect bug fails in the foreground.
