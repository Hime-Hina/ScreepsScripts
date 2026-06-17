# Role-split bootstrap economy PRD

## Goal

Split the universal bootstrap worker pool into role-specific RCL2/RCL3 economy demands after spawn requests and replacement pressure are in place.

## Requirements

- Keep emergency universal worker demand for room-loss recovery.
- Add explicit demand for miner, hauler, builder, and upgrader roles.
- Assign priorities so mining and hauling recover before discretionary build/upgrade work.
- Keep runtime execution snapshot-driven; avoid importing mature-bot manager/overlord architectures.

## Acceptance criteria

- Source mining demand is driven by source count and required WORK parts.
- Hauler demand is driven by carry throughput or source/container energy pressure.
- Builder demand is driven by construction backlog and planned body WORK parts.
- Upgrader demand is reduced when construction backlog or survival pressure is high.
