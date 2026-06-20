# Deferred GM runtime strategy switching design

## Deferred scope

The current `gm` console is intentionally inspect-first. Strategy switching remains separate because it changes live policy and can hide real autonomous bugs.

## Future shape

Potential future commands should prefer explicit names and TTLs, for example:

- display-only: `gm.strategy()` or `gm.budget()`.
- bounded directive: `gm.setStrategy(mode, { ticks })`.
- stop/reset: `gm.clearStrategy()`.

All commands must pretty-print current scope, expiry, and safety gates.

## Safety gates

Manual strategy must be ignored or downgraded when:

- hostiles or near-core threat require defense behavior;
- controller downgrade is warning/critical;
- worker count is below survival floor;
- CPU bucket forces survival-only budget.
