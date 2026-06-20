# Active hauler logistics PRD

## Goal

Make `hauler` creeps actively move energy from source-side containers into the room energy network and controller/storage sinks. Current names include haulers, but only `miner` has special behavior; haulers mostly behave as generic workers.

## Current live motivation

- Source containers contain energy: `20,43 e=539`, `29,6 e=580`.
- Controller container `27,8` is empty.
- Room is healthy but energy logistics are not intentionally chained.

## Requirements

1. Hauler harvesting mode:
   - prioritize withdrawing from source-local containers;
   - then other useful containers/storage/terminal if present and safe;
   - avoid direct harvesting unless fallback is necessary for survival/no source-container availability.
2. Hauler working mode:
   - first refill spawn/extensions;
   - then refill tower using existing tower refill ordering/reserve assumptions;
   - then deposit surplus into controller-side container if no storage exists;
   - later storage/terminal deposit can reuse same deposit decision type.
3. Preserve generic worker behavior and miner behavior unless the task explicitly needs a shared helper.
4. Avoid deadlocks: if no hauler-specific target exists, return a safe fallback or null that lets other creeps act.
5. Preserve controller downgrade critical/warning behavior and defense deferral semantics.

## Acceptance criteria

- Unit tests prove hauler withdraws from source-adjacent container before direct source harvest.
- Unit tests prove hauler refills primary energy structures before depositing surplus.
- Unit tests prove hauler deposits surplus into controller-side container when primary/tower energy is full.
- Unit tests prove hauler does not build/upgrade in the normal logistics path when a deposit target exists.
- Regression tests prove miner and generic worker decisions remain unchanged for existing representative cases.
- `pnpm check`, `git diff --check`, task validation, review, deploy/readback, PM2 restart, and short live monitoring pass.
