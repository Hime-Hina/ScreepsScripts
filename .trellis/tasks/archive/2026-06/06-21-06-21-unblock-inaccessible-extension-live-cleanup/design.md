# Unblock inaccessible extension live cleanup design

## Live-write algorithm

1. Fetch room objects and terrain through existing project API helpers.
2. Build obstacle set:
   - walls from terrain;
   - blocking structures: spawn, extension, tower, storage, terminal, link, wall, non-road blocking structures;
   - blocking construction sites for the same categories.
3. For every owned spawn/extension/tower, compute adjacent walkable positions.
4. Select exactly one target: owned `extension` at `x=35`, `y=22` with no accessible adjacent tile.
5. Read its id from the same room object snapshot used for the write.
6. Execute a console expression on `shard1` that rechecks in runtime before calling `destroy()`:
   - `Game.getObjectById(id)` exists;
   - `structureType === STRUCTURE_EXTENSION`;
   - `pos.roomName === 'W51N21'`, `x === 35`, `y === 22`;
   - then `destroy()`.
7. Do not create a construction site manually.

## Monitoring

Use `pnpm status:live:screeps` plus object/accessibility probes:

- Immediately after write: room status, hash, heartbeat, energy, site count.
- Short window: look for replacement `constructionSite` with `structureType=extension`.
- Final window: room remains healthy; if the site is still building, record progress rather than waiting indefinitely.

## Rollback

There is no structure-level rollback for a destroyed live extension. Risk is bounded because this extension is already inaccessible and equivalent to unavailable capacity. If planner fails to replace it, follow-up is a code/planner task rather than further manual manipulation.
