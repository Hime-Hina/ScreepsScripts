# Screeps 生产逻辑与 CI/CD 存活闭环设计

## Boundaries

- `src/main.ts` 继续只导入 runtime capture 和 tick operation，不放入策略、Memory、部署或测试逻辑。
- `src/runtime/` 继续拥有 Screeps globals、对象查找和直接 action 执行。
- `src/kernel/` 编排 tick：读取 typed memory、读取 world snapshots、调用领域决策、交给 runtime 执行。
- `src/spawning/` 继续拥有 spawn decision；本轮只扩展 early worker body 与人口目标，不引入 spawn queue 框架。
- `src/creeps/` 继续拥有 bootstrap worker action decision；本轮只改善 source 分配和早期工作优先级，不引入旧 role tree。
- `.github/workflows/check.yml` 只拥有默认 CI 门禁，不拥有 live deployment。
- live/PTR deployment 继续由现有 `scripts/screeps/*.mjs` 显式命令拥有。

## Production Behavior

### Worker Source 分配

当前所有 worker 都选择同房间第一个 source。新行为应在同房间 source 列表和 creep 列表已由 runtime boundary 排序/投影后，让多个 worker 可稳定分散到多个 source。

首选实现：

- `WorkerWorldSnapshot` 中保留 roomName、creep name、source id。
- `planBootstrapWorkerActions` 在每个房间内按 creep name 和 source id 做确定性分配。
- 分配不依赖 Memory，因此不引入 creep role state 或 migration。
- 如果房间只有一个 source，行为退化为当前单 source harvest。

该设计改善早期两源利用率，不引入 pathfinding、source slot 预订或静态矿工复杂度。

### Spawn 决策

当前固定 `[WORK,CARRY,MOVE]` 和人口 3。新行为应仍保证 200 energy 可恢复，但在 room energy capacity 足够时选择更强 body。

首选实现：

- `src/spawning/` 内部定义明确的 early worker body 候选，按 cost 从高到低选择当前可孵化 body。
- 保留最小 emergency body `[WORK,CARRY,MOVE]`，避免低能量阶段无法恢复。
- 人口目标仍是早期 worker 数，不在本轮引入 builder/upgrader/miner 多类型。
- 使用 `energyCapacity` 和 `availableEnergy` 的 snapshot，不从 strategy 读取 `Game.rooms`。

该设计提升升级吞吐，避免在 RCL1/RCL2 早期提前引入 spawn queue、extension layout 或 colony planner。

## Data Flow

```text
Game/Memory -> runtime snapshot + typed memory -> kernel -> spawning/creeps decisions -> runtime action execution -> Memory writeback + console diagnostics
```

CI/CD flow:

```text
push / pull_request -> GitHub Actions checkout -> corepack enable -> pnpm install --frozen-lockfile -> pnpm check
local release -> pnpm deploy:screeps -> API readback -> docs/game-state.md live record
rollback -> pnpm rollback:screeps -> API readback -> docs/game-state.md rollback record
```

## CI/CD Shape

- 默认 GitHub Actions workflow 名称：`check`。
- 触发：
  - `pull_request`
  - `push` 到 `master`
- job：
  - `runs-on: ubuntu-latest`
  - checkout
  - setup Node 22
  - `corepack enable`
  - `pnpm install --frozen-lockfile`
  - `pnpm check`
- 不配置 Screeps secrets。
- 不运行 `deploy:*`、`verify:*`、`rollback:*`、`scout:*`、`test:screeps-server`。

本轮不添加 GitHub 手动 live deploy workflow。原因是 live deployment 需要 GitHub repository secrets、environment protection、branch/rollback 记录和失败恢复策略；这些属于独立发布治理任务。现有本地显式部署命令继续承担 CD 闭环。

## CPU and Performance

- Source 分配只在当前 tick 的 visible room、current creeps、current sources 上做数组分组和索引选择。
- 不新增 PathFinder、不扫描相邻房间、不写大型 Memory cache。
- 预期 CPU 影响为 O(worker count + source count)，符合当前 CPU limit `20` 的 early-room 预算。
- 低 bucket 行为本轮不实现，因为 CPU bucket 仍是 `blocked` fact；不得基于未观察 bucket 写生产逻辑。

## Compatibility and Migration

- 不变更 Memory schema，除非实现中发现必须持久化 worker assignment。若需要 Memory 子树，必须先回到规划更新 schema 设计和 migration tests。
- 不保留旧 2021 role-based code 兼容。
- 不提交 generated `dist/`。

## Documentation Impact

- `docs/architecture.md`：更新 worker/spawn 行为描述。
- `docs/development.md`：更新 CI 状态。
- `README.md` / `CONTEXT.md`：若 CI 和生产状态摘要改变，避免与 `docs/game-state.md` 矛盾。
- `docs/game-state.md`：记录 live deploy/readback/natural tick 或 blocked reason。
- `.trellis/spec/tooling/ci-hooks.md`：若 workflow 契约从“尚未配置”变为“已配置”，同步更新。

## Rollback

- 代码层 rollback：revert `src/`、`test/`、docs、workflow 文件。
- Screeps live rollback：若已部署，使用 `pnpm rollback:screeps` 恢复 deploy 前 snapshot，并记录 readback。
- CI rollback：删除 `.github/workflows/check.yml` 并恢复 docs/spec 中 CI 状态。
