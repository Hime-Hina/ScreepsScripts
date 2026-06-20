# Controller container upgrader flow PRD

## Goal

Complete P1 role semantics after active haulers: make `upgrader` creeps consume controller-side stored energy and focus on upgrading, and keep `builder` creeps focused on build/critical-maintenance work only when that work exists.

## Requirements

- Upgrader harvesting mode prioritizes controller-local container/storage energy.
- Upgrader working mode upgrades the owned controller.
- Empty controller container fallback remains safe and does not starve survival refill.
- Builder working mode builds eligible construction sites, repairs critical infrastructure, and otherwise falls back to controller upgrading instead of refilling/general hauling.
- Downgrade warning/critical upgrade behavior remains at least as safe as before.

## Acceptance criteria

- Focused unit tests cover controller-local withdraw, upgrade-only working behavior, empty-container fallback, builder build/repair/fallback, and downgrade guard preservation.
- Existing hauler tests remain green.
- Full verification/deploy gates pass before live rollout.
