# Bootstrap/RCL3 TTL replacement pressure PRD

## Goal

Prevent worker population cliffs by counting near-expiring workers as replacement pressure before they die.

## Current context

After deploy, W51N21 worker count dropped from a healthier development population to 5 while spawn was idle. The immediate RCL3 demand deadlock is handled by the P0 unblock task; this task adds proactive replacement after spawn requests expose target gaps.

## Requirements

- Add replacement pressure for bootstrap/RCL3 workers whose `ticksToLive` is below a bounded threshold.
- Replacement pressure should increase request target gap without double-counting already spawning creeps.
- Survival floor remains stronger than replacement/development requests.
- Preserve deterministic behavior and snapshot-driven runtime boundaries.

## Acceptance criteria

- Tests prove near-expiring workers are counted as missing for request gap purposes.
- Tests prove healthy TTL workers are counted normally.
- Tests prove replacement does not create unbounded over-spawning.
- Focused tests, `pnpm check`, and task validation pass.
