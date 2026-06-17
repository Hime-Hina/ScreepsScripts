# Priority bootstrap spawn requests PRD

## Goal

Promote bootstrap spawning into a first-class priority `SpawnRequest` layer so multiple demand sources can compete before producing a single `SpawnDecision`.

## Requirements

- Expose request creation as a pure planning step in `src/spawning/spawn-decision.ts`.
- Include request type, room, priority, target gap, body catalog, and reason metrics.
- Preserve one final `SpawnDecision` per tick for current runtime execution.
- Remove implicit one-request-per-spawn assumptions where they prevent richer demand modeling.

## Acceptance criteria

- Survival requests outrank development requests.
- Larger target gaps break ties within same priority.
- Busy spawns do not erase demand; they only make a request non-executable for that tick.
- Unit tests cover queue ordering and executable selection.
