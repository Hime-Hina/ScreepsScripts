# RCL2 runtime integration and live verification design

## Scope

This child integrates the pure decision contracts from:

- `06-12-rcl2-worker-energy-flow-decisions`
- `06-12-rcl2-extension-planner-decisions`

It should start only after both contracts are implemented or available as patches.

Write ownership:

- `src/runtime/screeps-runtime.ts`
- `src/kernel/run-tick.ts`
- `test/integration/main-loop.test.ts`
- `test/e2e/compiled-loop.test.ts`
- README/CONTEXT/docs updates when behavior changes

## Runtime Capture Contract

Runtime should capture enough snapshot data to satisfy pure planners:

- energy structures: spawn and extensions with id/name, roomName, used energy, capacity
- construction sites: id, roomName, type, position
- room construction state: owned room, controller level, spawn position, existing structures/sites, blocked positions, local terrain/candidate wall data

Only runtime may access Screeps globals and constants such as `FIND_MY_STRUCTURES`, `FIND_MY_CONSTRUCTION_SITES`, `STRUCTURE_EXTENSION`, `RESOURCE_ENERGY`, `Room.createConstructionSite`, and `Creep.build`.

## Kernel Order

Recommended tick order:

1. Read memory.
2. Plan construction sites.
3. Plan spawn.
4. Plan worker actions.
5. Execute construction decisions.
6. Execute spawn decision.
7. Execute worker actions.
8. Write console telemetry and memory.

If implementation reveals a better order, document why in parent/child artifacts before changing it.

## Runtime Execution Contract

- `createConstructionSite`: call room position / room API once per decision.
- `refillEnergyStructure`: resolve structure by id/name and call `creep.transfer(target, RESOURCE_ENERGY)`.
- `buildConstructionSite`: resolve site by id and call `creep.build(site)`.
- Out-of-range build/refill actions should call existing movement helper.

## Verification Contract

- Integration tests stub Screeps globals at the runtime boundary.
- Unit decision tests remain owned by child decision tasks.
- Live deploy is manual and only after local gates pass.

## Non-goals

- Do not redesign pure decision contracts unless integration proves an actual contract defect.
- Do not add road/container/repair/tower behavior.
