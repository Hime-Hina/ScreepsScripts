# Controller container upgrader flow PRD

## Goal

Make `upgrader` creeps consume controller-side stored energy and focus on upgrading, closing the source-container -> hauler -> controller-container -> upgrader chain.

## Requirements

- Upgrader harvesting mode prioritizes controller-local container/storage energy.
- Upgrader working mode upgrades the owned controller.
- Empty controller container fallback remains safe and does not starve survival refill.
- Downgrade warning/critical upgrade behavior remains at least as safe as before.

## Acceptance criteria

- Focused unit tests cover controller-local withdraw, upgrade-only working behavior, empty-container fallback, and downgrade guard preservation.
- Existing hauler tests remain green.
- Full verification/deploy gates pass before live rollout.
