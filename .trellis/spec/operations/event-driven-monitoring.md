# Event-driven Monitoring

## Purpose

Screeps operations monitoring should prefer event-driven local processing over short-interval LLM polling.

## Rules

- Runtime-visible operations events use one console line prefixed with `[HERMES_EVENT]` followed by JSON.
- Event schema is `screeps.ops.event.v1`.
- The local bridge must parse, validate, redact, persist, and classify events deterministically before any Hermes/LLM wake-up.
- High-frequency data stays in local JSONL/SQLite-like storage; LLM calls are reserved for actionable or critical events that require reasoning, development, or cross-system coordination.
- The first bridge slice is read-only with respect to live Screeps state. It must not deploy, roll back, mutate Memory, send console commands, or switch active branches.
- Critical in-tick survival actions remain in Screeps runtime code; Hermes handles cross-tick operations, diagnosis, planning, issue/PR work, and authorized deployments.

## Secret boundary

- Do not log or persist Screeps tokens, account credentials, cookies, authorization headers, or full credential files.
- Redact sensitive metric keys before writing events to disk, issues, notifications, or Hermes prompts.
- Pass file paths to redacted event payloads when waking Hermes; do not pass raw credentials or raw config objects.

## Verification

Event-driven monitoring changes should include tests for:

- structured event parsing;
- normal heartbeat line ignoring;
- malformed event diagnostics;
- sensitive metric redaction;
- event persistence;
- deterministic policy classification and cooldown behavior.
