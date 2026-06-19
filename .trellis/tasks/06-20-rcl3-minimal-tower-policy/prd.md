# RCL3 minimal tower policy PRD

## Goal

Add the smallest safe tower policy for W51N21 after the RCL3 construction unblock allows the tower site at `37,21` to complete.

## Requirements

- Attack hostile creeps when present.
- Heal wounded owned creeps when no hostile attack target requires energy.
- Repair only conservatively outside combat; do not drain tower energy on broad road/container maintenance.
- Add tower refill priority to worker/spawn-request flow as needed.
- Preserve existing safe-mode and room-defense behavior.

## Acceptance criteria

- Unit tests cover attack > heal > conservative repair priority.
- Tower refill does not starve spawn/extensions or emergency survival.
- No action occurs when tower energy is insufficient or no target qualifies.
- Integration test proves runtime captures and executes tower actions.
