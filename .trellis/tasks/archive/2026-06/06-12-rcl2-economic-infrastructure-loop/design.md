# RCL2 economic infrastructure loop design

## Architecture Boundary

当前代码已经有清晰边界：

- `src/runtime/` 读取 Screeps globals 并执行真实 action。
- `src/kernel/` 编排 tick。
- `src/spawning/` 做 spawn decision。
- `src/creeps/` 做 worker action decision。

本任务新增一个规划边界，而不是把逻辑塞进现有 worker/spawn 文件：

- `src/construction/`：从 room construction snapshot 产出 construction planning decisions。
- `src/creeps/`：把 refill/build/upgrade 的 worker action priority 扩展到 RCL2 经济设施。
- `src/runtime/`：捕获 construction snapshot、执行 construction decisions、执行 build/refill energy structure action。
- `src/kernel/`：按 tick 顺序执行 construction planning、spawn decision、worker decisions。

## Child Task Map

- `06-12-rcl2-worker-energy-flow-decisions`
  - Write ownership: `src/creeps/worker-decision.ts`, `test/unit/creeps/worker-decision.test.ts`.
  - Output: pure worker decision contract for refill energy structure and build construction site.
  - May run in parallel with extension planner child.
- `06-12-rcl2-extension-planner-decisions`
  - Write ownership: `src/construction/`, `test/unit/construction/`.
  - Output: pure construction planner contract for RCL2 extension site decisions.
  - May run in parallel with worker decision child.
- `06-12-rcl2-runtime-integration-live-verification`
  - Write ownership: `src/runtime/screeps-runtime.ts`, `src/kernel/run-tick.ts`, integration/e2e tests, docs.
  - Depends on the two decision children.
  - Owns final `pnpm check`, `pnpm test:screeps-server`, live deploy/readback when approved.

## Data Flow

1. Runtime capture
   - owned rooms
   - controller level
   - spawn positions
   - structures: type, room, pos, hits, energy store where relevant
   - construction sites: type, room, pos, progress
   - sources/controllers positions when needed for exclusion

2. Construction planner
   - input: `ConstructionWorldSnapshot`
   - output: `ConstructionDecision[]`
   - first decision type: `createConstructionSite`
   - first structure type: `extension`

3. Worker planner
   - input: `WorkerWorldSnapshot`
   - output: `WorkerActionDecision[]`
   - action priority:
     1. harvest if free capacity > 0
     2. refill energy structure if energy > 0 and target not full
     3. build construction site if energy > 0 and site exists
     4. upgrade controller if energy > 0 and controller exists

4. Runtime execution
   - `createConstructionSite`: room position call
   - `refillEnergyStructure`: `creep.transfer(target, RESOURCE_ENERGY)`
   - `buildConstructionSite`: `creep.build(site)`
   - out-of-range actions reuse `moveToActionTargetWhenOutOfRange`

## Planning Strategy

Mature bots converge on three ideas:

- Keep construction planning separate from creep execution.
- Prioritize energy capacity and refilling before larger infrastructure.
- Delay road/container/repair/rampart complexity until the room can fund maintenance.

Therefore the first planner should use a deterministic, conservative candidate list near `Spawn1`:

- choose plain/swamp tiles around the spawn within a small radius;
- reject occupied positions, source/controller positions, existing structures, and existing construction sites;
- place at most the missing number of RCL2 extensions;
- use stable ordering so tests and live behavior are predictable.

This is intentionally not a full base planner. Full planners from Overmind/Kasami/Harabi use clusters, floodfill, roads, and min-cut. Those are future tasks after RCL2 economic loop is stable.

## Contracts

### ConstructionDecision

```typescript
interface CreateConstructionSiteDecision {
  readonly roomName: string;
  readonly structureType: 'extension';
  readonly type: 'createConstructionSite';
  readonly x: number;
  readonly y: number;
}
```

### WorkerActionDecision Additions

```typescript
interface RefillEnergyStructureDecision {
  readonly creepName: string;
  readonly structureId: string;
  readonly type: 'refillEnergyStructure';
}

interface BuildConstructionSiteDecision {
  readonly constructionSiteId: string;
  readonly creepName: string;
  readonly type: 'buildConstructionSite';
}
```

Replace `refillSpawn` with `refillEnergyStructure` rather than keeping both long-term. Tests should be updated at the same time so there is one refill concept.

## Operational Notes

- `createConstructionSite` can return errors when max sites, invalid target, or occupied tiles occur. Runtime should execute decisions; planner should avoid known invalid positions from snapshot.
- If a construction action fails at runtime, do not retry inside the same tick through fallback branches. Record enough behavior in tests first; runtime error handling can be a later resilience task if needed.
- Live deploy remains manual: `pnpm check`, `pnpm test:screeps-server`, `pnpm deploy:screeps`, `pnpm verify:live:screeps`, then API readback into `docs/game-state.md`.

## Rollback

- Before live deploy: revert source/test/docs changes.
- After live deploy: run `pnpm rollback:screeps`, then verify with `pnpm verify:live:screeps`.
