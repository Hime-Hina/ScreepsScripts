# RCL2 development worker demand

## Problem

W51N21 is healthy at RCL2 with all 5 extensions complete, no construction sites, full energy, no hostiles, and CPU bucket full. Current worker demand falls back to the survival floor of 3 workers when `constructionBacklogEnergy === 0`, leaving spawn time and source capacity underused while the room is primarily upgrading toward RCL3.

Observed state used for this task:

- shard/room: `shard1/W51N21`
- status: `normal`
- RCL: `2`, progress about `32301 / 45000`
- workers: `3`
- energy: `spawnEnergy=300/300`, heartbeat energy `550/550`
- construction sites: `0`
- hostiles: `0`
- recovery: `W51N21:roomHealthy`
- CPU bucket: `10000`
- structures: 1 spawn, 5 extensions, no containers/roads/towers

## Goal

Use the safe RCL2 state to increase development throughput by allowing the room to maintain 5 workers even when there is no construction backlog, so surplus energy can be converted into controller progress.

## Proposed scope

Change bootstrap worker demand logic so that a healthy RCL2 room with stable spawn/extension energy and an available spawn can select a 5-worker development demand even when `constructionBacklogEnergy === 0`.

Keep the existing survival safeguards:

- if workers are below survival floor, prioritize survival demand;
- if controller downgrade is not safe, do not expand workforce;
- if spawn/extension energy is unstable, do not expand workforce;
- if spawn is unavailable, do not expand demand;
- do not introduce live Memory writes or console writes.

## Out of scope

- Worker body scaling above the current 300-energy body.
- Road/container construction planning.
- RCL3 tower/extension planning.
- Deploy/restart unless separately authorized.

## Acceptance criteria

- Unit test proves RCL2 safe + energy stable + spawn available + no construction backlog selects target worker count 5.
- Unit tests preserve survival fallback for unsafe/unstable cases.
- Focused tests and `pnpm check` pass.
- If deployed later, `pnpm status:live:screeps` should show the room remains `normal` and trends toward 5 workers without recovery blockers.

## Suggested branch

`feat/rcl2-development-worker-demand`
