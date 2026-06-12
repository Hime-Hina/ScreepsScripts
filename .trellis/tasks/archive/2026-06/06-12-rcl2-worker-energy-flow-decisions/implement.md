# RCL2 worker energy-flow decisions implementation plan

## Checklist

- [x] Read parent `prd.md`, `design.md`, and this child `design.md`.
- [x] Add failing unit test for generic spawn/extension refill.
- [x] Replace `refillSpawn` with `refillEnergyStructure` in pure decision types.
- [x] Add failing unit test for build-before-upgrade.
- [x] Add `buildConstructionSite` decision.
- [x] Add regression test that empty worker still harvests assigned source.
- [x] Run `pnpm test:unit -- test/unit/creeps/worker-decision.test.ts`.

## Validation

```powershell
pnpm test:unit -- test/unit/creeps/worker-decision.test.ts
```

## Integration Handoff

Report:

- changed files
- final `WorkerWorldSnapshot` shape
- final `WorkerActionDecision` union
- any behavior that integration child must wire in runtime

Do not run live deploy from this child.

## Completed Handoff

- Changed files: `src/creeps/worker-decision.ts`, `test/unit/creeps/worker-decision.test.ts`.
- `WorkerWorldSnapshot` now contains `constructionSites`, `controllers`, `creeps`, `energyStructures`, and `sources`.
- `WorkerActionDecision` now contains `harvestSource`, `refillEnergyStructure`, `buildConstructionSite`, and `upgradeController`.
- Runtime integration must execute generic energy structure transfer and construction site build actions.
