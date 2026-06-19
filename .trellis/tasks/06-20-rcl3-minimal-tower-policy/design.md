# RCL3 minimal tower policy design

## Scope

This is not a full defense framework. It adds a small tower action planner and runtime execution boundary after W51N21 can build its first tower.

## Priority

1. Attack hostile creep, preferring dangerous/near-core targets if defense snapshots expose them.
2. Heal wounded owned creep.
3. Conservative repair only above an energy reserve and for critical non-wall structures.

## Boundaries

- No rampart/wall fortification automation.
- No remote-room defense.
- No market/lab/storage logic.
- Existing safe-mode planner remains the high-severity fallback path.
