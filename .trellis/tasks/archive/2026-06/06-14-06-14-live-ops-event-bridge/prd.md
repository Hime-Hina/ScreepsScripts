# Add live ops event bridge websocket

## Requirement

Add the next event-driven operations slice: a read-only live console websocket bridge that subscribes to Screeps console output, parses `[HERMES_EVENT]` lines, persists redacted events, and prints deterministic policy decisions.

## Scope

- Operations/tooling only.
- No `src/` game strategy changes.
- No Screeps deploy, rollback, Memory mutation, console expression submission, or branch switching.
- Existing dry-run bridge behavior remains available through a dedicated dry-run entrypoint.

## Acceptance Criteria

1. Live bridge authenticates with the configured Screeps token via websocket auth message, subscribes to `user:<accountId>/console`, and never prints the token.
2. Live bridge extracts console `messages.log` lines, ignores normal heartbeat lines, parses `[HERMES_EVENT]` records through the existing parser, persists them to JSONL when requested, and prints the same deterministic decision shape as dry-run.
3. Live bridge reconnects after a websocket close/error before the event limit is reached, within bounded retry settings for tests/smoke runs.
4. Dry-run functionality remains testable and documented.
5. Verification passes with focused unit/integration tests plus `pnpm check` and a final read-only `pnpm status:live:screeps`.
