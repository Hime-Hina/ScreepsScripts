# RCL2 worker body scaling

## Problem

W51N21 now has full RCL2 energy capacity (`550` total across spawn + extensions), but workers observed after deployment still use the 300-energy body:

```text
[WORK, CARRY, CARRY, MOVE, MOVE]
```

This leaves available energy capacity unused and limits harvest/upgrade throughput.

## Goal

Scale bootstrap/development worker body selection to use higher available room energy capacity safely, improving work throughput without making movement or refill behavior worse.

## Dependency

Start after `06-17-rcl2-development-worker-demand`, or after confirming the room can safely maintain a larger worker population.

## Proposed scope

Add or adjust worker body selection for RCL2 development/survival workers based on available energy capacity. Prefer simple, deterministic body tiers with tests.

Candidate direction to evaluate during design:

- preserve a cheap emergency body when energy is low;
- use a stronger body when capacity is 550 and energy is stable;
- keep enough `MOVE` and `CARRY` parts to avoid slow harvest/refill loops;
- avoid introducing role split complexity in this task.

## Out of scope

- Dedicated harvester/hauler/upgrader roles.
- Containers and roads.
- Spawn queue priority overhaul.
- Deploy/restart unless separately authorized.

## Acceptance criteria

- Tests cover current 300-energy body and at least one 550-capacity body tier.
- Emergency/survival low-energy spawning remains possible.
- `pnpm check` passes.
- If deployed later, live status remains `normal`, CPU bucket stays healthy, and newly spawned workers use the intended higher-capacity body.

## Suggested branch

`feat/rcl2-worker-body-scaling`
