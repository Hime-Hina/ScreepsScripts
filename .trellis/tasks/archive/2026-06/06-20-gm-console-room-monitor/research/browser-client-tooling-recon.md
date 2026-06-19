# Browser/client tooling reconnaissance for GM console tools

## Sources checked

- Official Screeps third-party tools page: warns that third-party tools may rely on unofficial APIs and may stop working; lists web client extensions, standalone consoles, autocomplete, stats, and visual/debugging tools.
- Screeps forum `CURRENT_ROOM` request: confirms server-side game code cannot know the browser-selected room; a client-side macro/preprocessor is the appropriate way to substitute a current room before sending a console command.
- Screeps forum RoomVisual/current-view thread: staff states game engine code is not aware of frontend client state; workarounds include manual commands, flags, custom client/Tampermonkey scripts, and API/auth-token signaling. Excessive automatic console posting can be rate-limited or locked down.
- `stybbe/Screeps-SC`: modular Chrome extension for Screeps. GitHub metadata checked 2026-06-20: 37 stars, 16 forks, last pushed 2020-09-03. Includes `modules/room.console.icons.js`.
- `screepers/screeps-visual`: browser userscript/extension visual API. GitHub metadata checked 2026-06-20: 26 stars, 5 forks, last pushed 2016-12-12. More relevant as a client-injection pattern than as console monitoring.
- `screepers/screeps-snippets`: community snippet archive. GitHub metadata checked 2026-06-20: 84 stars, 25 forks, last pushed 2023-07-21. Includes client-abuse snippets for viewed-room tracking.
- `screepers/screeps_console`: standalone interactive terminal console. GitHub metadata checked 2026-06-20: 57 stars, 12 forks, last pushed 2024-02-24. Useful external console, not a browser plugin.
- `Garethp/ScreepsAutocomplete`: IDE autocomplete definitions. GitHub metadata checked 2026-06-20: 502 stars, 105 forks, last pushed 2025-03-16. Useful for editor API completions, not in-game console completions.

## Relevant findings

### Screeps-SC console macros

`Screeps-SC` has a `room.console.icons.js` module that adds custom console buttons and keybindings. The module reads Angular page scope from the browser and preprocesses configured commands before calling the Screeps console send path.

Observed placeholders:

- `#{room}` is replaced from `scope.Room.roomName`.
- `#{id}` is replaced from `scope.Room.selectedObject._id`.
- `#{x}` / `#{y}` are replaced from `scope.Room.cursorPos`.

This proves the exact UX pattern we want is feasible client-side: the browser can inject the currently viewed room/object/coordinates into a console expression before the expression is sent to the server.

Risk: the extension targets the legacy Angular page structure/classes and was last pushed in 2020. Treat it as a design reference, not something to depend on directly.

### Client-abuse snippets

`screepers/screeps-snippets` includes viewed-room trackers:

- `util.inject.RoomTracker.js`: injects a script through console HTML, listens to room updates, then posts a hidden `user/console` expression to append viewed rooms to `global.roomsViewed`.
- `util.inject.RoomViewNotifier.js`: listens to `hashchange`, extracts shard/room from `window.location.hash`, and sends a console command to push viewed rooms into `Memory.roomViews`.

These snippets show two possible patterns:

1. client-local macro substitution: generate `gm.room('W51N21')` only when the user clicks/types;
2. client-to-runtime signaling: send `gm.setRoom('W51N21')` or another command when the browser view changes.

Risk: client-abuse relies on HTML/script injection through console output and/or internal client APIs. It should not be part of the first runtime-only GM task unless explicitly accepted.

### Official/current-room conclusion

The runtime still cannot know the currently open browser room by itself. A browser helper can know it, but any such helper is client-local and must handle multiple tabs independently.

## Recommendation for this task

Keep v1 runtime-only:

- `gm.room()` uses the server-side fallback chain: explicit room, `gm.setRoom`, `gm:room`, exactly one owned visible room, last room.
- Autocomplete constants (`gm.r`, `gm.c`, `gm.f`, `gm.s`) reduce typing without requiring a plugin.
- `gm.setRoom(roomName)` doubles as a future integration point for browser helpers.

Do not include a browser userscript/extension in v1. Add a future follow-up only if the user wants true browser-current-room behavior:

- small Tampermonkey/userscript or Screeps-SC-style module;
- reads current room/shard and selected object/cursor from the page;
- inserts or sends `gm.room('<room>')`, `gm.creep('<name>')`, `gm.setRoom('<room>')`, or `gm.watch(...)` commands;
- never sends commands automatically every tick;
- no Screeps password collection; use existing logged-in session only;
- clearly label dependency on unofficial/fragile frontend internals.

## Design implications to carry forward

- Provide `gm.setRoom(roomName)` and keep it pretty-printed; it is useful both manually and for a future client helper.
- Consider `gm.selected(idOrName)` only in a later browser-helper task; runtime-only code has no selected-object concept.
- Keep `gm:room` flag as the no-plugin current-room selector.
- Do not promise browser-current-room default in runtime-only implementation.
