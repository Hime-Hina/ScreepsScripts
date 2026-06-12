# RCL2 extension planner decisions implementation plan

## Checklist

- [x] Read parent `prd.md`, `design.md`, and this child `design.md`.
- [x] Add failing unit test for RCL2 room missing all 5 extensions.
- [x] Add `src/construction/` public planner.
- [x] Add failing unit test for built extension/site count reducing missing count.
- [x] Add failing unit test for occupied/wall/source/controller/spawn positions.
- [x] Add failing unit test for RCL1 no-op.
- [x] Run `pnpm test:unit -- test/unit/construction`.

## Validation

```powershell
pnpm test:unit -- test/unit/construction
```

## Integration Handoff

Report:

- changed files
- final `ConstructionWorldSnapshot` shape
- final `ConstructionDecision` union
- candidate ordering rule
- any assumptions runtime must satisfy when capturing snapshots

Do not run live deploy from this child.

## Completed Handoff

- Changed files: `src/construction/construction-planner.ts`, `test/unit/construction/construction-planner.test.ts`.
- `ConstructionWorldSnapshot` contains owned rooms with controller level, spawn position, terrain, structures, construction sites, and blocked positions.
- `ConstructionDecision` currently contains `createConstructionSite` for `extension`.
- Candidate order is spawn Chebyshev range `1`, then `2`; each range is sorted by `y`, then `x`.
- Runtime must capture terrain around the spawn and include source/controller/mineral positions in blocked positions.
