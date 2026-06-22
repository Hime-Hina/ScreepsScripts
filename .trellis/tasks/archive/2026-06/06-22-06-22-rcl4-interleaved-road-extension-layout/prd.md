# PRD: RCL4 interleaved road/extension layout

## Requirement

Current RCL4 extension expansion around `Spawn1` remains visually and operationally too crowded. New RCL4+ extension placement should prefer an interleaved road/extension pattern: roads occupy the approach lanes near the core while extension sites are staggered off those lanes instead of filling dense rings.

## Scope

- Adjust the pure construction planner in `src/construction/`.
- Preserve RCL2/RCL3 near-spawn bootstrap behavior.
- Preserve refill access safety for spawn, extension, storage, and tower targets.
- Add regression coverage through `planRoomConstruction` public behavior.
- If deployed, verify live readback and short W51N21 monitoring.

## Acceptance Criteria

- RCL4+ extension candidate ordering prefers positions orthogonally adjacent to planned/existing roads while avoiding road tiles themselves.
- New RCL4+ extension sites are returned before local interleaving road sites.
- Local interleaving road sites are bounded by the existing active construction backlog throttle.
- New RCL4+ extensions do not form dense orthogonal extension clusters.
- New RCL4+ extension sites remain at least two accessible adjacent refill tiles where the current access model can enforce it.
- Focused construction planner tests pass.
- `pnpm check` passes before deployment.
