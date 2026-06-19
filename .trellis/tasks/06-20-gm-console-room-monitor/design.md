# GM console room monitor tools design

## Core UX

Primary console namespace:

```js
gm.help()
gm.room()
gm.room('W51N21')
gm.creep('Worker71783702')
gm.intent('Worker71783702')
gm.watch()
gm.watch('W51N21', { every: 10, ticks: 100 })
gm.watch(gm.c.Worker71783702, { every: 1, ticks: 50, changesOnly: true })
gm.stop()
gm.watches()
gm.flags()
gm.setRoom('W51N21')
gm.rooms.W51N21
gm.r.W51N21
gm.creeps.Worker71783702
gm.c.Worker71783702
gm.flagNames.gm_room
gm.f.gm_room
gm.spawns.Spawn1
gm.s.Spawn1
```

`gm` means game master / game monitor. The API should favor short names because these commands are typed manually in the Screeps web console. Autocomplete constants should make rooms, creeps, flags, and spawns easy to pass by exact name without requiring prefix matching or browser-selected-room support.

## Current-open-room default

Screeps game code runs server-side and should not assume access to the browser client's currently opened room. The implementation should therefore offer a best-effort default-room resolver rather than a fake client-room integration.

Resolution order:

1. Explicit room argument, e.g. `gm.room('W51N21')`.
2. `globalThis.__gm.defaultRoomName` set by `gm.setRoom('W51N21')`.
3. A visible flag named exactly `gm:room`; use the flag's room.
4. Exactly one owned visible room in `Game.rooms`.
5. `globalThis.__gm.lastRoomName` from the last explicit successful command.
6. Return an error listing visible owned rooms and suggesting `gm.setRoom(roomName)` or `gm:room`.

This gives the desired low-typing workflow for the current one-room state while remaining honest about the browser selection limitation.

Browser-side tools can do better because they can read page state before sending a console expression. Research found Screeps-SC-style console macros and client-abuse viewed-room snippets that replace placeholders such as `#{room}` or signal viewed rooms back through console commands. Those are useful future references, but they depend on unofficial frontend internals. V1 should stay runtime-only and expose `gm.setRoom(roomName)` as the clean integration point for any later browser helper.

## Name constants for autocomplete

Register common named targets as enumerable properties under long and short namespaces:

```js
gm.rooms.W51N21 === 'W51N21';
gm.r.W51N21 === 'W51N21';
gm.creeps.Worker71783702 === 'Worker71783702';
gm.c.Worker71783702 === 'Worker71783702';
gm.flagNames.gm_room === 'gm:room';
gm.f.gm_room === 'gm:room';
gm.spawns.Spawn1 === 'Spawn1';
gm.s.Spawn1 === 'Spawn1';

gm.room(gm.r.W51N21);
gm.creep(gm.c.Worker71783702);
gm.watch(gm.c.Worker71783702, { changesOnly: true });
```

Constants are exact strings. This keeps `gm.creep()` exact-match-only while making long names easy to autocomplete and pass around.

Identifier rules:

- If a name is a valid JavaScript identifier, expose it directly as a dot property.
- Always expose the exact name as a bracket property, e.g. `gm.c['worker-1'] === 'worker-1'`.
- For names that are not valid identifiers, add a sanitized dot alias when unique, e.g. `gm.f.gm_move_Worker71783702 === 'gm:move:Worker71783702'`.
- If sanitized aliases collide, keep exact bracket-property access and omit the ambiguous dot alias; `gm.help()`/`gm.flags()` should mention omitted aliases only when relevant.

Namespace rules:

- `gm.rooms` and `gm.r`: visible/known room names.
- `gm.creeps` and `gm.c`: current `Game.creeps` names.
- `gm.flagNames` and `gm.f`: current `Game.flags` names. Do not use `gm.flags` for constants because `gm.flags()` remains the flag-reporting method.
- `gm.spawns` and `gm.s`: owned named spawn structures.
- Optional grouping object `gm.names` may mirror the long namespaces for discoverability.
- Do not add direct `gm.W51N21`/`gm.Worker...` constants in v1; direct properties pollute the command namespace and can collide with methods.

Rebuild constants idempotently during `installGmConsoleTools()` from current `Game` state plus `defaultRoomName`/`lastRoomName`. Do not write the list to `Memory` in this task.

## Human-readable output style

Every `gm` method that returns or prints information for a human operator must default to pretty-printed text. Dense single-line `key=value` output is only acceptable for machine-targeted runtime logs, not for `gm` console commands.

Style rules:

- Use a header line with command, target, and tick context.
- Use concise English labels by default because Screeps console commands, constants, and intent/action names are English-first.
- Group fields under section labels.
- Prefer one fact per line; allow short paired facts only when still easy to scan.
- Use indentation for hierarchy instead of comma-packed strings.
- Include deltas next to the metric they describe.
- Make errors actionable by showing the missing target and available alternatives.
- If a JSON/raw mode is added, require an explicit option such as `{ format: 'json' }`.

Example shape:

```text
[gm:room] W51N21 @ shard1 tick 71,783,790
Controller
  RCL: 3
  Progress: 64,759 / 135,000 (+42)
  Downgrade: 19,956
Energy
  Available: 542 / 650 (+50)
  Spawn: idle
```

Output delivery contract:

- One-shot commands (`gm.help`, `gm.room`, `gm.creep`, `gm.intent`, `gm.flags`, `gm.watches`, `gm.stop`, `gm.setRoom`) return the pretty-printed string so the Screeps console can display it as the command result.
- Scheduled watch samples write the pretty-printed string through the runtime-owned console output path.
- Do not both `console.log` and return the same string from one-shot commands unless tests prove the Screeps console suppresses duplicate return display.
- Tests should assert formatter output directly and integration should verify the installed command returns multi-line text.

## Runtime boundaries

Add a console/diagnostics layer rather than mixing operator formatting into planners:

```text
src/console/gm-console.ts
  installGmConsoleTools()
  runGmConsoleWatches()
  summarizeGmRoom()
  summarizeGmCreep()
  recordGmCreepIntent()
  applyGmFlagDirectives()

test/unit/console/gm-console.test.ts
test/integration/main-loop.test.ts
```

`src/main.ts` / tick orchestration should call:

```ts
installGmConsoleTools();
applyGmFlagDirectives(); // only for explicit manual control flags
runScreepsTick();
runGmConsoleWatches();
```

If flag directives need planner context, place them before normal worker actions but after console installation. If this produces messy ordering, implement flag move directives in the worker-action planning layer as high-priority manual decisions instead.

## Global state shape

Use `globalThis`, not `Memory`, for the first version:

```ts
interface GmConsoleState {
  readonly version: 1;
  defaultRoomName?: string;
  lastRoomName?: string;
  nextWatchId: number;
  watches: Record<string, GmWatch>;
  lastIntentByCreep: Record<string, GmCreepIntent>;
  lastWatchOutputById: Record<string, string>;
}
```

Global reset simply clears watches and history. That is acceptable for a live-debug console tool.

## Room summary contract

`gm.room(roomName?)` returns/prints a pretty-printed room report by default and may support explicit machine-readable output via `{ format: 'json' }` later.

Initial default output shape:

```text
[gm:room] W51N21 @ shard1 tick 71,783,790
Controller
  RCL: 3
  Progress: 64,759 / 135,000
  Downgrade: 19,956
Energy
  Available: 542 / 650
  Spawn: idle
Creeps
  Workers: 10
  Spawning: 0
Construction
  Sites: 4
  Progress: 1,224 / 14,000
  Types: extension=2 road=2
Threats
  Hostiles: 0
Resources
  Dropped energy: 0
  Tombstone energy: 0
  Ruin energy: 0
Runtime
  CPU: 0.08
  Bucket: 10,000
```

The formatter should be pure over a captured snapshot so tests can cover it without Screeps globals.

## Creep and intent contract

`gm.creep(name)` answers: where is this creep and what does the bot think it is doing?

Example:

```text
[gm:creep] Worker71783702 @ tick 71,783,790
Location
  Room: W51N21
  Position: 20,15
Lifecycle
  TTL: 1,220
  Spawning: false
Body
  Parts: 2 WORK / 1 CARRY / 1 MOVE
Energy
  Carry: 23 / 50
  Free: 27
State
  Role: worker
  Mode: collect
Intent
  Tick: 71,783,790
  Source: planner
  Action: harvestSource
  Target: source 59bbc… @ W51N21(19,43)
  Result: OK
```

Intent recording should happen at the runtime action boundary:

- before execution: record planned action/target/tick;
- after execution: add return code or thrown error;
- manual flag directives: record `manualMoveToFlag` with flag name/position.

A compact type should be independent of full planner internals:

```ts
interface GmCreepIntent {
  tick: number;
  creepName: string;
  roomName: string;
  action: string;
  targetId?: string;
  targetKind?: string;
  targetRoomName?: string;
  targetX?: number;
  targetY?: number;
  resultCode?: number;
  resultName?: string;
  error?: string;
  source: 'planner' | 'manual-flag';
}
```

Do not persist the intent history in `Memory` in this task.

## Watch semantics

A watch is an ephemeral periodic console printer managed by the bot loop.

It answers: "sample this target every N ticks and print the current state plus useful changes since the previous sample." It is not a persistent monitor, not an external process, and not a trigger for `Game.notify`/Hermes events. It must not simply replay existing console logs.

Single entry point:

```js
gm.watch(); // default room
gm.watch(gm.r.W51N21, { every: 10, ticks: 100 }); // room watch
gm.watch(gm.c.Worker71783702, { every: 1, ticks: 50, changesOnly: true }); // creep watch
gm.watch(gm.f.gm_room, { kind: 'flag' }); // optional flag-position watch
```

Target resolution:

1. omitted target: resolved default room;
2. string matching a visible/known room: room watch;
3. string matching `Game.creeps`: creep watch;
4. string matching `Game.flags`: return a pretty unsupported-target message in v1;
5. ambiguous string: require `options.kind` (`'room' | 'creep'`).

Room watch output should be a fresh pretty-printed snapshot/delta, for example:

```text
[gm:watch #1] Room W51N21 @ tick 71,783,790
Delta
  Controller progress: +42
  Energy available: +50
  Construction progress: +90
Controller
  RCL: 3
  Progress: 64,759 / 135,000
  Downgrade: 19,956
Energy
  Available: 542 / 650
  Spawn: idle
Creeps
  Workers: 10
  Spawning: 0
Construction
  Sites: 4
  Progress: 1,224 / 14,000
Threats
  Hostiles: 0
Runtime
  CPU: 0.08
  Bucket: 10,000
```

Creep watch output should focus on movement, energy, and intent/result changes:

```text
[gm:watch #2] Creep Worker71783702 @ tick 71,783,790
Delta
  Position: W51N21(20,15) -> W51N21(20,16)
  Intent target: source 59bbc… -> extension 5ab12…
Creep
  Room: W51N21
  Position: 20,16
  TTL: 1,220
  Energy: 23 / 50
Intent
  Action: transferEnergy
  Target: extension 5ab12… @ W51N21(21,16)
  Range: 1
  Result: OK
```

Default behavior:

- `gm.watch()` watches the resolved default room;
- room watch default interval: 10 ticks;
- room watch default TTL: 100 ticks;
- creep watch default interval: 1 tick;
- creep watch default TTL: 50 ticks;
- minimum interval: 1 for creep intent, 5 for room summaries;
- max simultaneous watches: 3;
- `changesOnly` compares normalized output fields with the previous sample and suppresses repeats.

Returned watch handle:

```text
[gm:watch] started id=1 kind=room target=W51N21 every=10 expiresAt=71783890
```

`gm.stop()` stops all watches; `gm.stop(1)` stops one; `gm.watches()` lists active watches.

## Flag design

Flags are useful because they can be placed in the room UI and read by game code. They are also persistent user-created game objects, so the command set must stay explicit and low-risk.

Recognized flags:

| Flag name | Meaning | Side effect |
|---|---|---|
| `gm:room` | Select default room for `gm.room()` / `gm.watch()` | none |
| `gm:watch:<creepName>` | Focus/watch a creep's intent; `gm.flags()` reports it and `gm.watch()` can attach to it | none |
| `gm:move:<creepName>` | Move only the named visible creep toward this flag while it exists | `creep.moveTo(flag)` only |

Safety rules:

- Ignore unrecognized `gm:` flags with a warning in `gm.flags()`.
- Never spawn, attack, dismantle, claim, suicide, remove construction, or write Memory from flag directives in this task.
- If the named creep is missing/spawning/not visible, print a clear skipped message and do nothing.
- A valid `gm:move:<creepName>` flag is a per-creep manual override: execute only `creep.moveTo(flag)` for that creep and skip the normal autonomous planner action for that creep on that tick.
- Manual move should be visible through `gm.intent(creepName)` as `source=manual-flag`.
- Multiple move flags for the same creep should be rejected deterministically rather than choosing an arbitrary flag.

## Runtime strategy switching

This v1 GM console task does not add manual strategy or mode switching.

Current runtime strategy remains autonomous and code-driven:

- tick budget chooses `full` vs `survival-only` from CPU bucket state;
- bootstrap worker demand chooses survival vs development demand from room snapshots;
- defense and construction gates are derived from live room state.

The GM tool may inspect those decisions and apply the narrow `gm:move:<creepName>` manual override, but it must not write persistent strategy directives, change Memory policy, toggle global modes, switch deployment branches, or otherwise reconfigure the planner in v1. If manual strategy switching is needed later, create a separate task with explicit command names, persistence/TTL rules, safety gates, and tests.

## Installation and error isolation

- `installGmConsoleTools()` must be idempotent and cheap.
- Console functions should catch their own expected errors and return strings/objects rather than throwing through the main loop.
- `runGmConsoleWatches()` should catch per-watch formatter errors, print a `[gm:error]` line, and keep the main loop alive.
- The console tool should not emit `[HERMES_EVENT]` unless a future task explicitly turns GM events into ops events.

## Testing design

Public behavior tests should use fake Screeps globals and pure snapshot builders:

- formatter tests for room/creep/intent output;
- default room resolver tests;
- watch scheduler tests across ticks;
- flag parser tests;
- integration test proving `globalThis.gm` is installed by the main loop;
- integration test proving read-only commands do not call mutating APIs;
- flag move directive test proving only `creep.moveTo(flag)` is called for the named creep.

## Rollout

This is runtime code included in the bundle. Rollout should follow the normal flow: RED tests, implementation, focused tests, `pnpm check`, Codex read-only review, explicit deploy approval, live readback, and a short status/console smoke.
