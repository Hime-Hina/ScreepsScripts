# Event-driven Screeps operations

This repository uses an event-driven operations model for Hermes maintenance. The goal is to avoid high-frequency LLM polling while still letting Hermes react to important game events.

## Runtime event line

Screeps runtime code should emit structured operations events as one console line:

```text
[HERMES_EVENT] {"schema":"screeps.ops.event.v1","id":"worker-low-71630000","severity":"actionable","kind":"worker_below_target","tick":71630000,"shard":"shard1","room":"W51N21","summary":"worker count below target","metrics":{"workers":2,"target":3},"cooldownTicks":300}
```

Runtime heartbeat is also emitted as a structured `runtime_heartbeat` event. The old plain `[tick ...]` heartbeat is kept only as rollout compatibility in read-only status tooling; runtime emitters should use `[HERMES_EVENT]` with one space before the JSON payload for readability.

## Severity policy

| Severity     | Local decision                                  |
| ------------ | ----------------------------------------------- |
| `info`       | record only                                     |
| `warning`    | record only in the first slice                  |
| `actionable` | record and wake Hermes, cooldown-gated          |
| `critical`   | record, notify, and wake Hermes, cooldown-gated |

The bridge policy is deterministic. It does not call an LLM for every console line.

## Claim ledger and email fallback

Console websocket output is the primary channel. `Game.notify` email is a critical-only fallback. Both channels must use the same event `dedupeKey`, and active actions are gated through a local claim ledger:

```text
.screeps/ops-claims/<sha256(dedupeKey + claim-window)>.json
```

The claim file is created atomically. The first channel to claim an active event inside a cooldown-sized claim window is the owner and may notify or wake Hermes. Later console/email duplicates for that window are recorded as `duplicate=true`, reduced to `actions=["record"]`, and must not start a second Hermes response. Later incidents with the same stable `dedupeKey` can claim a new window, so stale claim files do not suppress future critical alerts forever.

Email fallback can be evaluated without starting an agent:

```bash
pnpm ops:event-email-fallback:screeps -- --event-line '[HERMES_EVENT] {"schema":"screeps.ops.event.v1","id":"test-1","dedupeKey":"spawn_missing:shard1:W51N21","severity":"critical","kind":"spawn_missing","tick":1,"shard":"shard1","room":"W51N21","summary":"spawn missing"}' --claim-store-default
```

Expected fallback states:

| State       | Meaning                                                               |
| ----------- | --------------------------------------------------------------------- |
| `claimed`   | Email was first owner; a critical fallback notification may be sent.  |
| `duplicate` | Console/another channel already owns the event; suppress notify/wake. |
| `ignored`   | No structured event or a non-critical event.                          |

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

The live bridge authenticates with `screeps.json`, subscribes to `user:<accountId>/console`, persists structured events, and only acts on console lines with the `[HERMES_EVENT]` prefix. Claim-store use is enabled by default for the live bridge; use `--no-claim-store` only for local foreground experiments that must not create claim files.

## Dry-run command

Use the dry-run command to test parsing, JSONL persistence, and policy decisions without connecting to Screeps:

```bash
pnpm ops:event-bridge:dry-run:screeps -- --dry-run-line '[HERMES_EVENT] {"schema":"screeps.ops.event.v1","id":"test-1","severity":"critical","kind":"spawn_missing","tick":1,"shard":"shard1","room":"W51N21","summary":"spawn missing"}' --store-default
```

`--store-default` writes to a day-scoped JSONL file under `.screeps/events/` so long-running bridge output is not concentrated in one unbounded `live.jsonl` file. Add `--claim-store-default --source console|email` to exercise duplicate suppression in dry-run mode.

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
pm2 start scripts/screeps/ops-event-bridge.mjs --name screeps-event-bridge -- --shard shard1 --store-default --claim-store-default
```

Run a bounded smoke command before PM2 promotion so a missing token, websocket auth failure, or reconnect bug fails in the foreground.
