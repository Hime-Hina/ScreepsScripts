# GM console room monitor tools

## Goal

Provide a lightweight in-game Screeps console toolkit named `gm` for the most common live-debugging tasks: inspect the current room, inspect a creep, see the bot's latest intent for a creep, run bounded continuous monitoring, and use flags for explicit manual focus/control during debugging.

## Requirements

- Expose a global `gm` object in the Screeps runtime after deployment.
- Keep the default path read-only: summary, creep, intent, and watch commands must not mutate `Memory`, create structures, spawn creeps, or move creeps.
- Use short console commands optimized for manual typing:
  - `gm.help()`
  - `gm.room(roomName?)`
  - `gm.creep(creepName?)`
  - `gm.intent(creepName?)`
  - `gm.watch(target?, options?)`
  - `gm.stop(watchId?)`
  - `gm.watches()`
  - `gm.flags()`
  - `gm.setRoom(roomName)`
- Room arguments should be optional whenever practical. Default room resolution must reduce manual input:
  1. explicit command argument;
  2. `gm.setRoom(roomName)` default stored in `globalThis`;
  3. a visible `gm:room` flag's room;
  4. the only owned visible room, when exactly one exists;
  5. the last explicit room used in this global runtime;
  6. otherwise return a clear error listing visible owned rooms.
- Register autocomplete constants for common named targets:
  - `gm.rooms.W51N21 === 'W51N21'` and short alias `gm.r.W51N21` for rooms;
  - `gm.creeps.Worker71783702 === 'Worker71783702'` and short alias `gm.c.Worker71783702` for creeps;
  - `gm.flagNames.gm_room === 'gm:room'` and short alias `gm.f.gm_room` for flags, because `gm.flags()` remains the flag-reporting method;
  - `gm.spawns.Spawn1 === 'Spawn1'` and short alias `gm.s.Spawn1` for named spawns;
  - constants are exact string values, so `gm.creep(gm.c.Worker71783702)` uses exact matching;
  - constants are regenerated idempotently from currently visible rooms/creeps/spawns/flags plus known default/last room values, without writing `Memory`.
- The browser's currently opened room is desired UX, but game code cannot rely on it being available server-side. The implementation must document the fallback behavior instead of pretending the client-selected room is always knowable.
- `gm.room()` should print a compact single-room health summary covering the common operator questions:
  - shard/room/tick/RCL/progress/downgrade;
  - room energy and spawn state;
  - worker count and spawning count;
  - construction site count/progress/type counts;
  - hostile count;
  - dropped/tombstone/ruin energy counts where visible;
  - CPU used and bucket.
- `gm.creep(name)` should print the common per-creep facts:
  - room/position/body/work parts/ticksToLive/spawning;
  - carry energy/free capacity;
  - role/energy mode/working state where present;
  - latest recorded intent summary if available.
- `gm.intent(name)` must expose the bot's latest known planned/executed intent for a creep:
  - tick;
  - action kind;
  - target id/type/room/position;
  - result code or error when execution already happened;
  - fallback message when no intent is recorded.
- Watch functionality must be bounded, safe, and useful beyond replaying existing logs:
  - stored only in `globalThis`;
  - lost on global reset;
  - default TTL;
  - minimum interval;
  - maximum simultaneous watches;
  - room watches compute fresh health snapshots and deltas from current `Game` state, not existing console log lines;
  - creep watches compute fresh creep state plus latest intent/action/result changes;
  - `changesOnly` option suppresses unchanged output for noisy creep-intent watches.
- Flag support must be explicit and safe by default:
  - `gm.flags()` reports recognized GM flags and their interpreted meaning;
  - `gm:room` can select the default room;
  - `gm:watch:<creepName>` can mark a creep for intent watch/focus;
  - `gm:move:<creepName>` is included in the first version as the only manual control directive, causing only `creep.moveTo(flag)` for the named creep while the flag exists;
  - `gm:move:<creepName>` must be a per-creep manual override: while a valid move flag is active, the named creep skips its normal autonomous planner action for that tick;
  - no destructive or irreversible flag commands in this task.
- Manual flag control must be visible in intent/debug output so operator-induced movement is distinguishable from autonomous planner behavior.
- Human-readable labels should default to concise English because Screeps console commands, constants, and intent/action names are English-first.
- All `gm` methods whose output is meant for a human must default to pretty-printed, sectioned text:
  - no dense single-line `key=value` blocks for `help`, `room`, `creep`, `intent`, `watch`, `watches`, `flags`, `stop`, `setRoom`, or errors;
  - group related fields under readable section headings;
  - include one fact per line or a small cluster per line only when it remains scan-friendly;
  - optional machine-readable output must be explicit, e.g. `format: 'json'`, not the default.

## Non-goals

- No persistent Memory-based watch configuration in the first version.
- No runtime strategy/mode switching in v1; existing autonomous strategy selection remains code-driven rather than GM-console-driven.
- No attack/claim/dismantle/suicide flag directives.
- No automatic deployment or rollback as part of planning.
- No external CLI that sends commands into Screeps console.
- No browser userscript/extension in v1; browser-current-room integration is a separate optional follow-up because it relies on unofficial/fragile client internals.
- No graphical dashboard; keep output text-first.

## Acceptance criteria

- [ ] All human-facing `gm` outputs use pretty-printed, sectioned text by default; no operator-facing method returns a dense one-line status dump.
- [ ] `gm.help()` lists supported commands and safe defaults in pretty-printed sections.
- [ ] `gm.room()` works without a room argument when exactly one owned visible room exists or `gm:room`/`gm.setRoom()` has selected a room.
- [ ] `gm.rooms.<roomName>`/`gm.r.<roomName>`, `gm.creeps.<creepName>`/`gm.c.<creepName>`, `gm.flagNames.<flagAlias>`/`gm.f.<flagAlias>`, and `gm.spawns.<spawnName>`/`gm.s.<spawnName>` expose autocomplete-friendly exact-name constants for common named targets.
- [ ] `gm.room(gm.r.W51N21)`, `gm.creep(gm.c.Worker71783702)`, and `gm.watch(gm.c.Worker71783702, { changesOnly: true })` behave the same as exact literal strings.
- [ ] `gm.room('W51N21')` returns a compact summary without side effects.
- [ ] `gm.creep(name)` returns creep facts plus latest intent when available.
- [ ] `gm.intent(name)` returns the latest recorded intent with action, target, tick, and result/error.
- [ ] `gm.watch()` periodically prints bounded room health snapshots plus useful deltas and auto-expires.
- [ ] `gm.watch(gm.c.Worker71783702, { changesOnly: true })` monitors creep state and intent changes without printing every tick when unchanged.
- [ ] `gm.watch(gm.f.gm_room, { kind: 'flag' })` returns a pretty unsupported-target message in v1 rather than creating a flag-position watch.
- [ ] `gm.stop()` stops watches.
- [ ] `gm.flags()` recognizes at least `gm:room`, `gm:watch:<creepName>`, and `gm:move:<creepName>`.
- [ ] `gm:move:<creepName>` moves only the named visible creep toward the flag and records the manual directive as an intent/control entry.
- [ ] While a valid `gm:move:<creepName>` flag exists, the named creep's normal planner action is skipped for that tick so the manual move is not overwritten.
- [ ] Unit and integration tests prove the read-only console commands do not call mutating Screeps APIs.
- [ ] Focused tests, `pnpm check`, `git diff --check`, and task validation pass before implementation is considered complete.
