# Unblock inaccessible extension live cleanup PRD

## Goal

Remove the known live layout blocker in `W51N21`: owned extension at `35,22` has `0/50` energy and no accessible adjacent refill tile, keeping room energy effectively stuck at `750/800`.

## Scope

Allowed:

- Read-only status/object/terrain/accessibility probes.
- One bounded live write: destroy exactly `extension@35,22` if it still matches the expected blocker.
- Post-cleanup monitoring and evidence recording.

Forbidden:

- Destroying any other structure.
- Creating replacement sites manually unless a later task explicitly authorizes a rescue after planner failure.
- Memory writes, branch switches, deploys, or unrelated console expressions.

## Acceptance criteria

- Pre-write probe confirms `extension@35,22` is owned, structure type `extension`, energy `0/50` or not materially useful, and has `accessibleAdjacent=[]`.
- The write executes only against the specific object id read immediately before the write.
- Post-write room remains `status=normal`, `recoveryStates=W51N21:roomHealthy`, hostiles `0`, heartbeat verified.
- Current deployed planner creates an accessible replacement extension site, or if no site appears within the monitoring window, the task records a blocked follow-up rather than hand-placing structures.
- No new inaccessible spawn/extension/tower target is introduced.
