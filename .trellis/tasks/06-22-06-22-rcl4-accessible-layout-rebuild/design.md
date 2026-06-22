# Design

## Live diagnosis

The current core is a dense radius-2 ring around `Spawn1` at `35,23`:

```text
S=spawn E=extension T=tower G=storage r=road
20: r........
21: .rEEET...
22: .rE.EE...
23: .rESEG...
24: .ErEEE...
25: .rEEE....
```

`extension@36,23` is between spawn and storage. After storage was completed at `37,23`, the extension's only refill-adjacent tile is `35,22`. Destroying that one extension opens `36,23` as a walkway, which also improves nearby one-access targets without destroying storage.

## Planner change

Current invariant is `>0` adjacent refill-access tile. That prevented fully inaccessible structures but allowed one-tile chokes. Replace it with a conservative minimum:

- preferred minimum for new refill targets: 2 accessible adjacent tiles;
- for an existing target with 2+ access tiles, a new candidate must preserve at least 2;
- for an existing legacy target with exactly 1 access tile, a new candidate must preserve that 1 and must not make it worse;
- for an existing target with 0 access tiles, keep the existing exception so unrelated construction is not frozen;
- candidate self-access must meet the preferred minimum.

This keeps the change surgical and compatible with legacy bad layouts.

## RCL4 extension expansion

Keep early RCL2/RCL3 placement behavior stable. For RCL4+ extension planning, expand near-spawn candidates to range 3 so the planner can place the remaining five RCL4 extensions outside the saturated range-2 core.

Storage can also evaluate range 3, but the access guard is the important recurrence prevention.

## Live cleanup boundary

After deploying the recurrence fix:

1. Re-read `extension@36,23` by id.
2. Proceed only if the object is still type `extension`, room `W51N21`, position `(36,23)`.
3. Execute `Game.getObjectById('6a2d5693807ef83b6e6eb8c8').destroy()` via Screeps console API.
4. Do not destroy storage or place manual construction sites.
5. Verify the planner creates accessible replacement/RCL4 extension sites naturally.

## Verification

- `pnpm vitest run test/unit/construction/construction-planner.test.ts`
- `pnpm check`
- `git diff --check`
- `python3 .trellis/scripts/task.py validate .trellis/tasks/06-22-06-22-rcl4-accessible-layout-rebuild`
- `pnpm deploy:screeps`
- `pnpm verify:live:screeps`
- `pnpm status:role-recovery:screeps`
- short monitor samples after cleanup
