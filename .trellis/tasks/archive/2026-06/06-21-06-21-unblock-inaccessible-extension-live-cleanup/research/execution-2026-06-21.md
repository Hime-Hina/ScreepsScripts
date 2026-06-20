# P0 cleanup execution evidence — 2026-06-21

## Pre-write probe

Target confirmed immediately before live write:

```json
{
  "id": "6a3197440b0194477b995435",
  "type": "extension",
  "x": 35,
  "y": 22,
  "energy": 0,
  "cap": 50,
  "accessible": [],
  "blockedAdjacent": [
    "34,21(extension)",
    "35,21(extension)",
    "36,21(extension)",
    "34,22(extension)",
    "36,22(extension)",
    "34,23(extension)",
    "35,23(spawn)",
    "36,23(extension)"
  ]
}
```

Only blocked/depleted owned refill target in the accessibility probe was this extension.

## Live write

Submitted one guarded Screeps console expression to `shard1`:

- `Game.getObjectById('6a3197440b0194477b995435')` must exist.
- `structureType === STRUCTURE_EXTENSION`.
- `pos.roomName === 'W51N21'`, `x === 35`, `y === 22`.
- `s.my === true`.
- Only then call `destroy()`.

API submit result: HTTP `200`, payload `ok=1`.

## Post-write monitoring

Four samples over about one minute showed:

| sample | tick | status | recovery | target present | construction sites | site | inaccessible refill targets | heartbeat energy | bucket |
|---:|---:|---|---|---|---:|---|---:|---|---:|
| 1 | 71807554 | normal | W51N21:roomHealthy | false | 1 | extension@37,22 20/3000 | 0 | 750/750 | 10000 |
| 2 | 71807560 | normal | W51N21:roomHealthy | false | 1 | extension@37,22 40/3000 | 0 | 258/750 | 10000 |
| 3 | 71807566 | normal | W51N21:roomHealthy | false | 1 | extension@37,22 40/3000 | 0 | 264/750 | 10000 |
| 4 | 71807572 | normal | W51N21:roomHealthy | false | 1 | extension@37,22 40/3000 | 0 | 357/750 | 10000 |

Spawn started spawning during monitoring, explaining transient room energy consumption. No hostiles and heartbeat remained verified.

## Result

P0 cleanup succeeded:

- legacy inaccessible `extension@35,22` removed;
- current deployed planner automatically created replacement `extension@37,22`;
- no inaccessible owned spawn/extension/tower target remains in the post-write accessibility checks;
- room remained healthy.
