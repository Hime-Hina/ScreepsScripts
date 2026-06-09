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
