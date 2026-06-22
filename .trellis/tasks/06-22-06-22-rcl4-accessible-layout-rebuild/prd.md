# RCL4 accessible layout rebuild

## Problem

W51N21 has reached RCL4 with storage built at `37,23`. The legacy dense extension ring left `extension@36,23` with only one refill-adjacent tile (`35,22`). A hauler was observed targeting that extension from `38,25` with `ERR_NOT_IN_RANGE`, and the storage/extension cluster creates avoidable refill congestion.

Current read-only evidence:

- Room: `W51N21`, `shard1`
- Status: `normal`, `roomHealthy`, no hostiles
- RCL: 4
- Built storage: `37,23`
- Blocked GM target: `extension@36,23`, id `6a2d5693807ef83b6e6eb8c8`
- Refill access count for `extension@36,23`: 1 (`35,22`)
- Current extension count: 15; RCL4 limit is 20, but planner has no construction sites because the radius-2 near-spawn core is saturated.

## Goals

1. Prevent recurrence: new storage/tower/extension placements must not reduce an already reasonably accessible refill target to a one-tile choke.
2. RCL4 expansion must plan additional accessible extension sites outside the boxed spawn ring.
3. Perform a minimal live cleanup for the confirmed bad extension so the completed storage no longer boxes it in.
4. Keep the room safe during migration: no storage destruction, no broad memory migration, no manual mass site placement.

## Non-goals

- Do not destroy or relocate storage.
- Do not introduce a full base-layout planner or traffic manager.
- Do not create remote-mining or expansion logic.
- Do not manually place all RCL4/RCL5 sites from the external agent.

## Acceptance criteria

- Unit regression proves a storage candidate is rejected when it would reduce an extension from two refill-access tiles to one.
- Unit regression proves RCL4 extension planning expands to accessible range-3 candidates when the radius-2 ring is saturated.
- Existing one-access legacy structures do not freeze unrelated safe planning; future candidates must not worsen their current access.
- Focused construction tests pass.
- `pnpm check`, `git diff --check`, and Trellis validation pass.
- Deploy readback reports `apiReadback=main-matched`.
- Live cleanup destroys only `extension@36,23` if it is still the same extension id/type/position immediately before the write.
- Post-cleanup live status remains `normal`; construction sites for accessible replacement/RCL4 expansion appear and no new inaccessible refill target is introduced.
