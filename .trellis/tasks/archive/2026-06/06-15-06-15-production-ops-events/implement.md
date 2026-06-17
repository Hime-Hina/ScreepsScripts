# Implementation Plan

## Slice 1: runtime structured heartbeat

1. Add a small TypeScript ops event formatter under `src/runtime/`.
2. Add `shardName` to `ScreepsTickIO` and captured runtime.
3. Replace the legacy `[tick ...]` heartbeat in `runTick` with a structured `runtime_heartbeat` event.
4. Update `run-tick` tests to assert `[HERMES_EVENT]` JSON and absence of plain heartbeat.

## Slice 2: runtime structured alerts + critical email fallback

1. Extend `RuntimeAlertDecision` to include `opsEvent` and `emailFallback`.
2. Convert existing alert selectors to produce structured events and stable `dedupeKey`.
3. Emit each alert to console through `writeConsoleLine`.
4. Call `Game.notify` only when `emailFallback=true`, with the same structured event line as the body.
5. Update alert tests.

## Slice 3: bridge claim ledger

1. Add `scripts/screeps/ops-event-claims.mjs` with atomic file claims.
2. Export/use `readOpsEventDedupeKey` from `ops-event.mjs`, preferring explicit `dedupeKey`.
3. Add claim-store arguments/defaults to live and dry-run paths.
4. Update decision summaries with claim ownership and duplicate suppression.
5. Add tests for console/email duplicate ownership.

## Slice 4: email fallback CLI

1. Add `scripts/screeps/ops-event-email-fallback.mjs`.
2. Parse `--event-line`, `--message-file`, or stdin text for `[HERMES_EVENT]` lines.
3. Ignore non-critical events by default.
4. Claim active critical fallback events with `source=email`.
5. Output deterministic `fallback=claimed|duplicate|ignored` summary.
6. Add package script and tests.

## Slice 5: status parser + docs

1. Update `live-survival-status.mjs` to parse structured heartbeat events first and keep legacy fallback.
2. Update operations docs, architecture/CONTEXT if long-term language changes.
3. Run focused tests and full `pnpm check`.
4. Open PR; do not deploy until explicitly authorized.

## Codex review status

Attempted local Codex review paths before implementation:

- `hermes mcp test laptop_codex` timed out after 40s.
- Local `codex exec` failed with revoked/invalidated token.
- Direct SSH to TuringMachine is reachable on port 22 but denied publickey auth.

Proceeding with direct implementation and local/CI verification; record Codex unavailability in the PR notes if still unavailable.
