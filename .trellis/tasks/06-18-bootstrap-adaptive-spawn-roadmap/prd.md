# Bootstrap and RCL3 economy stabilization roadmap PRD

## Goal

Stabilize W51N21's post-RCL3 economy and turn the bootstrap worker system into a safe, extensible early-game economy. The current room is healthy but stalled: RCL3, 5 workers, spawn idle, room energy stuck at `600/650`, and construction frozen at `1224/14000` with 3 extension sites and 1 tower site.

## Current live trigger

The roadmap was revised after the GM console deployment and live inspection on 2026-06-20:

- `status=normal`, `roomHealthy`, no hostiles, CPU bucket full.
- RCL3 controller progress continues slowly, but construction is not advancing.
- Worker population fell from the post-deploy high to 5, while spawn is idle.
- Existing code still gates development demand on `controllerLevel === 2` and strict spawn/extension full-energy state.
- The near-spawn cluster contains an empty extension at `35,22` that is surrounded by spawn/extensions/construction sites.

## Child tasks and order

0. Archived: `06-18-adaptive-bootstrap-worker-demand` — first adaptive worker-demand slice completed and archived.
1. `06-20-rcl3-economy-unblock-accessible-layout` — immediate P0 to unblock RCL3 demand/construction and prevent inaccessible near-spawn layouts.
2. `06-18-priority-bootstrap-spawn-requests` — promote spawn demand into explicit prioritized requests.
3. `06-18-bootstrap-ttl-replacement-pressure` — count near-expiring workers before they die.
4. `06-18-role-split-bootstrap-economy` — split universal workers into miner/hauler/builder/upgrader logistics once request accounting exists.
5. `06-20-rcl3-minimal-tower-policy` — add the smallest safe RCL3 tower behavior after tower construction can complete.

## Non-goals

- No rollback; the room is healthy.
- No live structure destruction or Memory/console write in planning tasks.
- No remote expansion until this room's RCL3 economy is stable.
- No full traffic manager or empire/base-layout rewrite.
- No GM runtime strategy switching in the immediate roadmap; that remains a deferred standalone task.

## Acceptance criteria

- Active child tasks reflect the current W51N21 state and have PRD/design/implement docs where the behavior is non-trivial.
- The next implementation task can be handed to an agent with curated `implement.jsonl` and `check.jsonl` context.
- Each child preserves runtime-boundary rules, survival fallback behavior, and explicit deploy gates.
