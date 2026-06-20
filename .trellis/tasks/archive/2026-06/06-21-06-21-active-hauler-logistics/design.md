# Active hauler logistics design

## Current planner facts

- `WorkerCreepSnapshot.role` can be `worker | miner | hauler | builder | upgrader`.
- `planBootstrapWorkerAction` currently special-cases only `role === 'miner'`.
- Existing decisions include `withdrawEnergy`, `refillEnergyStructure`, and `depositEnergy`.
- Runtime already captures neutral containers and owned store structures for withdrawals/deposits.
- Existing target type priorities prefer containers for withdrawal and primary energy structures for refill.

## Target behavior

Add a small `planHaulerAction` branch before generic worker behavior:

```text
if role === 'hauler':
  if harvesting:
    withdraw from source-local energy withdrawal/container first
    fallback to any best energy withdrawal
    fallback to harvest assigned source only if no withdrawal exists
  else:
    refill spawn/extension first
    refill tower second
    deposit into controller-local container/storage/safe deposit target
    fallback to upgrade only if no deposit/sink exists and controller safety requires it
```

## Source-local vs controller-local target selection

Use existing positions already present in snapshots:

- Source-local withdrawal: withdrawal/container within range 2 of an assigned source, then by available energy and range/id.
- Controller-local deposit: energy deposit/container within range 3 of the room controller, then by gap/range/id. If the current snapshot lacks enough metadata for this, first add minimal fields to `WorkerEnergyDepositSnapshot` rather than reading Screeps globals in planner code.

## Reservation model

- Reuse `reservedWithdrawEnergyById` for hauler withdrawals.
- Reuse `reservedRefillEnergyById` for spawn/extension/tower refill.
- Reuse `reservedDepositEnergyById` for deposit targets.
- Do not let all haulers reserve the same controller container beyond free capacity.

## Production risk controls

- Generic workers continue to refill primary structures before build/upgrade.
- Hauler code must not prevent survival workers from harvesting/refilling if hauler count is insufficient.
- No change to spawn demand in this task; role counts remain current until throughput model task.
- If a target selector cannot find a specialized target, fallback is conservative, not speculative.
