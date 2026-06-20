# Role-split container logistics for bootstrap/RCL3 economy PRD

## Goal

Use W51N21's existing source and controller containers as active logistics anchors by splitting universal bootstrap workers into miner, hauler, builder, and upgrader roles after spawn requests and TTL replacement are stable.

## Current context

The room has 3 containers: source containers at `29,6` and `20,43`, and controller container at `27,8`. All were empty in the live snapshot, which means construction placed logistics scaffolding before the code had producer/consumer roles to use it consistently.

## Requirements

- Preserve emergency universal worker recovery for room-loss cases.
- Add source miner demand driven by visible sources and desired WORK parts.
- Add hauler demand based on source/container/controller energy flow.
- Add builder/upgrader demand based on construction backlog and controller progress needs.
- Use explicit spawn request priorities from the prior task.
- Keep runtime action execution snapshot-driven; do not import mature-bot manager/overlord patterns.

## Acceptance criteria

- Tests prove miners fill or use source-container positions rather than generic workers crowding source slots.
- Tests prove haulers move energy from source containers toward spawn/extensions and controller/build sinks.
- Tests prove builders/upgraders are bounded by backlog and available logistics.
- Emergency universal workers still recover low-population rooms.
