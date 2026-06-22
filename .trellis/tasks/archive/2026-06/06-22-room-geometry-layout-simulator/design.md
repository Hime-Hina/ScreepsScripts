# Design: Geometry Snapshot and Visual Simulator

## Data Inputs

- Terrain via `readRoomTerrainText`.
- Room objects via `readRoomObjects`.
- Existing live-state facts from `docs/game-state.md`.

## Candidate Output

For each candidate:

```text
legend: S spawn, T tower, G storage, E extension, e extension site, R road, r road site, C container, # wall, . open
metrics: extensions, extensionSites, roadSites, refillAccess, roadConnectivity, buildCost, blockedCount
```

## Safety Boundary

The simulator is read-only and can run before any design approval. It should support saved fixture input for tests so reviewers do not need live credentials.
