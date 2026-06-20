# Live baseline 2026-06-21

Evidence collected before implementation:

- Git branch clean `main` at `7fe6d90 fix(runtime): vacate roads after worker actions`.
- No active Trellis tasks before this train.
- `pnpm status:live:screeps` sample:
  - branch `main`, shard `shard1`, room `W51N21`, status `normal`;
  - module hash `6ada0cd2226dc99e3849c127c687e51dcf7e61b8daa8b53fc4053348fb1f2e05`;
  - controller RCL3, progress `106864`, recovery `W51N21:roomHealthy`;
  - `spawnEnergy=300/300`, heartbeat `750/800`, construction sites `0`, hostiles `0`;
  - natural heartbeat verified at tick `71807477`, CPU bucket `10000`, budget `full`.
- Room object/accessibility probe from prior plan found owned `extension@35,22` had `energy=0/50`, `accessibleAdjacent=[]`, and all adjacent tiles blocked by spawn/extensions.
