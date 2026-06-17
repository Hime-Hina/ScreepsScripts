# Bootstrap TTL replacement pressure PRD

## Goal

Avoid worker cliffs by counting near-expiring workers as replacement pressure in bootstrap demand and spawn requests.

## Requirements

- Capture worker `ticksToLive` in spawning snapshots.
- Add a `respawnAge`-style replacement window for bootstrap workers.
- Increase target gap by near-expiring workers without killing existing creeps.
- Keep survival replacement higher priority than development replacement.

## Acceptance criteria

- A room at target count with one near-expiring worker plans replacement.
- A room at target count with all workers healthy does not over-spawn.
- Replacement pressure appears in request reason metrics after the priority request task.
