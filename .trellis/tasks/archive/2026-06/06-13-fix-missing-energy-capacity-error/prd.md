# Fix missing Screeps energy capacity error

## Goal

Prevent the live runtime boundary from throwing `Screeps store did not report energy capacity.` when a room energy structure is present but its `store.getCapacity(RESOURCE_ENERGY)` reports `null` during capture.

## Confirmed Facts

- The live log shows tick `71642729` reporting `spawnEnergy=300/300` with `construction=5`, then one runtime error from `readEnergyCapacity`, then tick `71642731` reporting `spawnEnergy=300/350` with `construction=4`.
- The stack trace places the failure inside `captureRoomEnergyStructures`, reached while `captureSpawningWorld` reads room energy structures.
- `src/runtime/screeps-runtime.ts` currently reads spawn and extension capacity through `store.getCapacity(RESOURCE_ENERGY)` and throws when Screeps returns `null`.
- Screeps docs state `Store.getCapacity(resource)` may return `null` when the resource is invalid for the store type.
- Screeps spawn and extension energy capacities are structure-level invariants, not kernel decisions. The installed Screeps type definitions expose `SPAWN_ENERGY_CAPACITY` and `EXTENSION_ENERGY_CAPACITY`.

## Requirements

- The runtime boundary must capture spawn and extension energy capacity without depending on a transient `null` from `store.getCapacity(RESOURCE_ENERGY)`.
- Kernel, spawning, colony, and creep decision modules must continue receiving numeric `energyCapacity` values.
- Invalid or unsupported energy-structure types must remain excluded at the runtime boundary.
- The fix must not add compatibility modes, flags, or broad fallback behavior.

## Acceptance Criteria

- [x] Given an owned room with a spawn and an extension whose store reports used energy but `getCapacity(RESOURCE_ENERGY)` returns `null`, when `loop()` runs, then it does not throw `Screeps store did not report energy capacity.`
- [x] Given the same room at RCL2, the heartbeat room summary reports combined spawn/extension capacity as `spawnEnergy=<used>/350`.
- [x] Existing spawn-only heartbeat behavior remains unchanged.
- [x] A focused regression test fails before the fix and passes after the fix.

## Out of Scope

- Changing spawn body selection, construction planning, repair behavior, defense behavior, or CPU budget policy.
- Adding live deployment, rollback, or destructive production actions.
- Adding support for non-spawn/non-extension refill targets.

## Open Questions

- None.
