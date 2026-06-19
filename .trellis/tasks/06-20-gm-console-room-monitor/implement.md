# GM console room monitor tools implementation plan

## Phase 0: planning gate

- Keep this task in planning until PRD/design/implementation plan are reviewed.
- Do not deploy or write live Screeps Memory during planning.
- Before implementation, create/switch to branch `feat/gm-console-room-monitor` from the agreed base.

## RED tests

1. Add unit coverage for default room resolution:
   - explicit room wins;
   - `gm.setRoom()` default works;
   - `gm:room` flag works;
   - single owned visible room works;
   - multiple rooms without default returns actionable error.
2. Add room summary and autocomplete-constant tests:
   - RCL/progress/downgrade;
   - energy/spawn/workers/construction/hostiles/resources/CPU;
   - absent optional fields render as `-` or `0`, not crashes;
   - `gm.rooms.W51N21`/`gm.r.W51N21` resolve to `'W51N21'`;
   - `gm.creeps.Worker71783702`/`gm.c.Worker71783702` resolve to the exact creep name;
   - `gm.flagNames.gm_room`/`gm.f.gm_room` resolve to the exact flag name while `gm.flags()` remains callable;
   - `gm.spawns.Spawn1`/`gm.s.Spawn1` resolve to the exact spawn name;
   - invalid identifier names have exact bracket access;
   - sanitized aliases are added only when unique; colliding sanitized aliases are omitted rather than suffixed;
   - constants refresh idempotently when visible/known names change.
3. Add pretty-print tests for all human-facing methods:
   - `gm.help()`, `gm.room()`, `gm.creep()`, `gm.intent()`, `gm.watch()` samples, `gm.watches()`, `gm.flags()`, `gm.stop()`, `gm.setRoom()`, and expected errors contain sectioned multi-line output;
   - one-shot commands return multi-line pretty strings and do not duplicate output through `console.log` by default;
   - scheduled watch samples write multi-line pretty strings through the runtime output path;
   - default output does not collapse all human-readable fields into one dense `key=value` line;
   - explicit `{ format: 'json' }` or equivalent machine-readable output, if implemented, is opt-in only.
4. Add creep summary and intent tests:
   - `gm.creep(name)` and `gm.creep(gm.c.Worker71783702)` include position/body/energy/TTL/spawning;
   - `gm.intent(name)` and `gm.intent(gm.c.Worker71783702)` return latest planned/executed action;
   - missing creep and missing intent return readable messages.
5. Add watch scheduler tests:
   - `gm.watch()` room watch prints fresh snapshots/deltas at configured tick interval;
   - `gm.watch(gm.c.Worker71783702)` creep watch prints creep state plus latest intent/action/result changes;
   - TTL auto-expires;
   - `gm.stop(id)` and `gm.stop()` stop watches;
   - `gm.watch(gm.f.gm_room, { kind: 'flag' })` returns a pretty unsupported-target message in v1;
   - `changesOnly` suppresses unchanged intent output;
   - ambiguous target strings require `options.kind`.
6. Add flag parser/control tests:
   - `gm.flags()` recognizes `gm:room`, `gm:watch:<creepName>`, `gm:move:<creepName>`;
   - unrecognized `gm:` flags are reported but ignored;
   - duplicate move flags for one creep are rejected;
   - `gm:move:<creepName>` calls only `creep.moveTo(flag)` for the named creep;
   - a valid manual move flag prevents that creep's normal planner action from executing in the same tick.
7. Add integration coverage in `test/integration/main-loop.test.ts`:
   - main loop installs `globalThis.gm` idempotently;
   - read-only GM commands do not call mutating Screeps APIs;
   - runtime worker action execution records intent/result for `gm.intent()`.

## GREEN implementation

1. Create `src/console/gm-console.ts` with pure helpers first:
   - default room resolver;
   - room summary snapshot/formatter;
   - creep summary snapshot/formatter;
   - watch scheduler state machine and unified target resolver;
   - flag parser.
2. Add global-state helper:
   - `readOrCreateGmConsoleState()`;
   - versioned state reset if shape changes;
   - no Memory writes.
3. Add `installGmConsoleTools()`:
   - idempotently assign `globalThis.gm`;
   - command methods catch expected errors and return printable strings;
   - rebuild autocomplete constants for rooms, creeps, flags, and spawns.
4. Add `runGmConsoleWatches()`:
   - execute due watches after normal tick work;
   - enforce interval/TTL/max watches;
   - support `changesOnly`.
5. Add intent recording at the runtime action boundary:
   - record planned worker action before executing;
   - add return code/result name after executing;
   - record errors before surfacing them through existing runtime action failure paths.
6. Add flag support:
   - parse recognized flags;
   - implement read-only `gm.flags()` output;
   - implement only `gm:move:<creepName>` as manual control;
   - make manual move a per-creep override that filters/skips that creep's normal autonomous worker decision for the tick;
   - record manual move as an intent with `source='manual-flag'`.
7. Do not add GM commands for runtime strategy/mode switching in this task; keep existing strategy selection autonomous and inspect-only.
8. Wire into `src/main.ts` or the existing tick orchestration:
   - install tools every tick;
   - apply manual flag movement at a deterministic point;
   - run watch output after the main tick.
9. Add package script only if useful, e.g. no script needed for in-game console functionality.

## Verification commands

```bash
pnpm vitest run test/unit/console/gm-console.test.ts test/integration/main-loop.test.ts
pnpm vitest run test/unit test/integration
pnpm check
git diff --check
python3 ./.trellis/scripts/task.py validate 06-20-gm-console-room-monitor
```

## Review gate

- Ask Codex for read-only review after implementation and local verification.
- The review prompt should focus on runtime safety, Memory side effects, flag-control risk, and whether watch output can spam the console.
- Treat Codex output as advisory; verify tests and diff locally.

## Deploy gate

- Do not deploy automatically after implementation.
- If deployment is approved, use the normal Screeps deploy flow:
  - preflight status;
  - `pnpm deploy:screeps`;
  - API readback;
  - status sample;
  - quick console/manual smoke if feasible.

## Resolved design decisions before `task.py start`

- Use the planned defaults: room watches every 10 ticks for 100 ticks; creep watches every 1 tick for 50 ticks.
- Sanitized autocomplete aliases are added only when unique. If two exact names normalize to the same alias, omit the ambiguous alias and keep exact bracket access.
