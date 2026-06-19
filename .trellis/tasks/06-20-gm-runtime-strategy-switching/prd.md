# GM runtime strategy switching

## Goal

Add a future GM-console-controlled way to inspect and temporarily override runtime strategy/mode selection without weakening survival safeguards.

This is a follow-up task to `06-20-gm-console-room-monitor`; it must not be implemented as part of GM console v1.

## Requirements

- Expose strategy state through human-readable GM console output before adding mutation commands.
- Support explicit strategy/mode commands only after the mode contract is defined, for example:
  - `gm.strategy()` to inspect current effective strategy and override state;
  - `gm.setStrategy(roomName, mode, options?)` to set a bounded override;
  - `gm.clearStrategy(roomName?)` to clear overrides.
- Initial strategy modes must be intentionally small and map to existing runtime concepts rather than inventing a broad planner system:
  - `auto`: use existing autonomous strategy selection;
  - `survival-only`: force survival worker spawning/action inputs where safe;
  - optional future modes such as `build-focus` or `upgrade-focus` require separate design evidence.
- Overrides must have a TTL by default and print the expiry tick.
- Scope must be explicit: room-scoped first; global/shard-wide overrides are non-goals unless separately approved.
- Persistence semantics must be explicit:
  - v1 design should prefer `globalThis` ephemeral overrides unless the user explicitly accepts Memory persistence;
  - Memory-backed overrides require schema/versioning and a clear cleanup path.
- Safety gates must override manual strategy when survival is at risk:
  - zero workers or below survival floor;
  - controller downgrade critical/warning when applicable;
  - hostile/core defense risk;
  - spawn missing/unavailable critical state;
  - CPU bucket emergency.
- All human-facing output must be sectioned pretty print and concise English by default.
- Strategy mutations must be visible in `gm.room()` / `gm.strategy()` output and, where relevant, runtime telemetry.
- Unit/integration tests must prove TTL expiry, safety override behavior, and no accidental Memory writes when ephemeral mode is selected.

## Non-goals

- No implementation in the GM console v1 task.
- No attack/claim/expansion strategy toggles.
- No deploy branch switching or active branch changes.
- No broad Memory migration unless Memory persistence is explicitly designed.
- No browser plugin/userscript dependency.

## Acceptance criteria

- [ ] PRD/design specify exact command names, mode enum, scope, TTL defaults, and persistence model.
- [ ] Safety gates are documented and tested to override manual strategy.
- [ ] `gm.strategy()` or equivalent inspect command returns multi-line pretty output.
- [ ] Strategy set/clear commands return actionable pretty output and list expiry/scope.
- [ ] Overrides do not bypass survival spawning, downgrade recovery, or defense safeguards.
- [ ] Focused tests, `pnpm check`, `git diff --check`, and task validation pass before implementation is complete.
