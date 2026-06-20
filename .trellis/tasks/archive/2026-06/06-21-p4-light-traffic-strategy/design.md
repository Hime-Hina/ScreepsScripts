# P4 light traffic strategy design

The smallest useful traffic slice is to make source assignment role-aware. `assignHarvestSources` currently sorts all creeps by name, so adding/removing legacy workers can shift miner assignments. Instead, sort creeps by role priority (`miner`, `worker`, `hauler`, `builder`, `upgrader`) then name. This anchors miners to source slots first while preserving deterministic fallback for non-miners.
