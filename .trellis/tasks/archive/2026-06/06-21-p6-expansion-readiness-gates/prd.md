# P6 expansion readiness gates PRD

## Goal

Make expansion/remote-mining planning explicitly depend on local-room readiness instead of starting claim/remote work too early.

## Requirements

- Define a pure readiness gate for expansion prerequisites: RCL4+, storage built with usable energy capacity, role logistics stable, TTL replacement enabled, monitoring stable, and scout intel fresh.
- Existing remote room scoring remains available but should be consumed only after the gate is open.
- Missing prerequisites are returned as deterministic reasons.

## Acceptance criteria

- Unit tests cover blocked readiness before RCL4/storage/logistics.
- Unit tests cover ready state when all prerequisites are true.
- Existing remote scoring tests remain green.
