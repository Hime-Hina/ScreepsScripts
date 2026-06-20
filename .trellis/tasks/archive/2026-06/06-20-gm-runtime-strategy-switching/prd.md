# Deferred GM runtime strategy switching PRD

## Goal

Design bounded manual runtime strategy directives for the in-game `gm` console after autonomous RCL3 economy stabilization is complete.

## Current priority decision

This task is explicitly deferred. W51N21's current bottleneck is autonomous economy/layout policy: RCL3 development demand is hidden, construction is stalled at `1224/14000`, and room energy is stuck at `600/650`. Manual strategy switching would not be the right first fix.

## Requirements when resumed

- Any manual strategy must be bounded by TTL/scope and visible in `gm` output.
- Manual directives must never override critical defense, downgrade, or survival behavior.
- No persistent unbounded Memory switches.
- Strategy display is allowed before strategy mutation.

## Acceptance criteria

- Tests prove TTL expiry, safety gates, and clear operator output.
- The task is not started until P0/P1 economy stabilization tasks are complete or explicitly bypassed.
