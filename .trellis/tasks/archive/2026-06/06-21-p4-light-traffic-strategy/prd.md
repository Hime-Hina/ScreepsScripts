# P4 light traffic strategy PRD

## Goal

Improve source/route hygiene without introducing a full traffic manager.

## Requirements

- Miner source assignment should be stable and role-aware so miners claim source anchors before haulers/builders/generic workers.
- Existing action-specific movement ranges and road-vacate behavior remain intact.
- No global path cache or cross-room traffic system.

## Acceptance criteria

- Unit tests prove miners receive deterministic source assignments independent of legacy worker/hauler names.
- Hauler/generic harvest fallback still works when miners are absent.
- Existing runtime movement tests stay green.
