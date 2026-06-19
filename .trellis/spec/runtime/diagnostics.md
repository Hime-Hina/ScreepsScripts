# Diagnostics

## Tick Context

Diagnostics emitted from runtime code must carry enough game context to act on them.

Current reference:

```text
[tick 42] cpu=1.25
```

Room-level diagnostics should include the room name once owned rooms are known. Creep-level diagnostics should include the creep name only when the log is actionable.

Live verification diagnostics must remain attributable after copy/paste into `docs/game-state.md`: include tick, CPU, and room when room ownership is known.

## Logging Boundary

Use runtime-owned output functions. Do not add a logging library until a task defines a concrete need such as structured local replay, persistent metrics, or production alerting.

Current reference:

- `ScreepsTickRuntime.writeConsoleLine(message)` owns console output.
- `runTick` writes through that runtime method.

## Human-Readable Console Output

Console tools whose primary consumer is a human operator must default to pretty-printed, sectioned output rather than dense one-line `key=value` dumps.

Default human-readable output should:

- use a short header with command/target/tick context;
- group related fields under labels such as `Controller`, `Energy`, `Creeps`, `Construction`, `Intent`, and `Delta`;
- put one fact per line or a small number of closely related facts per line;
- align labels enough for quick scanning, without relying on fragile terminal-width assumptions;
- include deltas only where they help diagnosis;
- print actionable missing-state errors with the attempted target and the available alternatives;
- avoid hiding important data in comma-packed strings that require manual parsing.

Machine-readable output must be an explicit option such as `format: 'json'`; it must not replace the default pretty output. Runtime heartbeat and structured ops events may stay compact because their primary consumers are parsers, not humans.

## Error Visibility

Screeps code runs every tick, so failures must be visible with tick or room context. Do not hide invalid state with silent returns.

Add a global error mapper only when a task requires stack mapping or deployment rollback behavior and includes tests for it.

## Secrets

Never log:

- Screeps auth tokens.
- Account credentials.
- Full `screeps.json` contents.
- Large serialized `Memory` dumps every tick.
- Rollback snapshots that contain remote code or credential-adjacent metadata.

Use `screeps.example.json` for documented shape and keep live credentials in ignored local files.
