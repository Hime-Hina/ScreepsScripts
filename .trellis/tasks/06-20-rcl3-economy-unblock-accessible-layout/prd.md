# RCL3 economy unblock and accessible layout PRD

## Goal

Unblock W51N21's safe RCL3 economy after live status showed 5 workers, idle spawn, room energy stuck at `600/650`, and construction frozen at `1224/14000`.

## Requirements

- Safe RCL3 rooms with construction backlog must retain development worker demand; do not return survival demand just because `controllerLevel !== 2`.
- Worker spawn decisions must be based on affordable body options and safety state, not solely on every spawn/extension being full.
- Construction eligibility must avoid permanent deadlock when a single extension is not refilled but the room is healthy, has workers, has no hostiles, and has usable energy.
- Preserve survival and downgrade safety: critical downgrade, unsafe defense state, or worker population below floor must still prioritize survival behavior.
- Near-spawn extension/tower site planning must preserve access to spawn/extensions and avoid creating fully sealed energy structures. W51N21's empty `extension@35,22` is the regression fixture.
- Do not destroy live structures, write Memory, or issue Screeps console commands in this task. If `35,22` needs live remediation, report it as a separate confirmed operation after code prevents recurrence.

## Acceptance criteria

- Unit tests reproduce W51N21-like RCL3 safe room at `600/650` energy with backlog and idle spawn, then prove development worker demand remains visible.
- Spawn-decision tests prove an affordable worker body can be requested even when spawn/extension energy is not perfectly stable, while survival gates remain stronger.
- Construction-eligibility tests prove safe construction can proceed under the new energy policy and remains deferred for hostile/critical survival states.
- Construction-planner tests prove near-spawn candidates do not seal existing or planned energy-structure access.
- Focused tests, `pnpm check`, `git diff --check`, task validation, and read-only Codex review pass before deploy.
- Post-deploy live verification should show either worker spawning/growth or construction progress after the new hash is live.
