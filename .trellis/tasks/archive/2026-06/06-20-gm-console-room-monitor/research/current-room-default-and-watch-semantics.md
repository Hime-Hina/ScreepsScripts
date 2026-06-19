# Current-room default and watch semantics notes

## Current opened room limitation

The desired UX is `gm.room()` defaulting to the room currently open in the Screeps browser UI. Game code executed by Screeps runs server-side and should not assume access to the browser client's selected room. The implementation should therefore avoid claiming true client-current-room detection unless a later spike proves an official server-side signal exists.

Best-effort default design:

1. explicit room argument;
2. `gm.setRoom(roomName)` stored in `globalThis`;
3. flag `gm:room` placed in a visible room;
4. exactly one owned visible room;
5. last explicit successful room;
6. clear error listing visible owned rooms.

For the current one-owned-room production state, `gm.room()` will normally work without typing the room name.

Autocomplete-friendly constants are a complementary UX path:

```js
gm.rooms.W51N21 // returns 'W51N21'
gm.r.W51N21 // short room alias
gm.creeps.Worker123 // returns exact creep name
gm.c.Worker123 // short creep alias
gm.flagNames.gm_room // returns 'gm:room'
gm.f.gm_room // short flag alias
gm.spawns.Spawn1 // returns exact spawn name
gm.s.Spawn1 // short spawn alias

gm.room(gm.r.W51N21)
gm.creep(gm.c.Worker123)
gm.watch(gm.c.Worker123, { changesOnly: true })
```

Room names such as `W51N21` are valid JavaScript property identifiers because they start with a letter. Creep, flag, and spawn names may not always be valid identifiers, so the console constants should expose exact bracket access plus sanitized autocomplete aliases where safe. Constants can be regenerated from current `Game` state each tick without needing browser state or `Memory` writes.

## What watch means

A GM watch is an in-game, tick-driven, ephemeral pretty-printer:

- it is stored in `globalThis`, not `Memory`;
- it samples fresh `Game` state and latest recorded intents, not existing console log output;
- all human-facing output is multi-line, sectioned, and readable by default;
- room watches print health metrics plus deltas such as energy change, controller progress change, construction progress change, repair-critical count, hostiles, resources, and intent errors;
- creep watches print position/TTL/energy plus latest intent target/result and changes such as movement, target change, action change, or stalled output;
- it expires after a TTL or can be stopped;
- it is lost on global reset;
- it does not call `Game.notify`;
- it does not create Hermes ops events;
- it is for interactive debugging, not durable monitoring.

Examples:

```js
gm.watch()                                      // default room, every 10 ticks, 100 ticks
gm.watch(gm.r.W51N21, { every: 5, ticks: 50 })  // explicit room watch
gm.watch(gm.c.Worker123, { every: 1, ticks: 30, changesOnly: true })
gm.stop()                                      // stop all watches
```

This differs from the external ops event bridge: the bridge is durable, deterministic, and intended to wake agents; GM watch is temporary console convenience for a human operator.
