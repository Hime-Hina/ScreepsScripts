# P3 role demand throughput model PRD

## Goal

Move post-bootstrap role spawning away from fixed counts toward bounded throughput, backlog, downgrade, and role-specific TTL replacement signals.

## Requirements

- Miner target follows effective source/source-container count.
- Hauler target increases when source-container energy backlog exists and spawn/extensions/controller-side sinks need energy.
- Builder target is zero with no construction backlog and increases for large RCL4 storage/extension backlog.
- Upgrader target is driven by controller downgrade urgency and available controller/storage buffer.
- Role-specific TTL replacement can request a critical role even when total population is above the generic target.

## Acceptance criteria

- Unit tests cover high source-container backlog -> additional hauler demand.
- Unit tests cover zero construction backlog -> no builder request.
- Unit tests cover large RCL4 backlog -> builder demand.
- Unit tests cover downgrade warning/critical preserving upgrader/survival priority.
- Unit tests cover role-specific TTL replacement not being suppressed by population surplus.
