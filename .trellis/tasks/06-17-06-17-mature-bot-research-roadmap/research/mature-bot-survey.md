# Mature bot survey

## 研究范围与约束

- 研究日期：2026-06-17。
- 本文只记录“模式证据 -> 本地采纳/拒绝 -> 后续任务映射”，**不复制外部代码**。
- 本地约束来自 `docs/architecture.md`、`.trellis/spec/runtime/domain-boundaries.md`、`.trellis/spec/research/player-code-research.md`：
  - 保持 `runtime snapshot -> memory state -> kernel -> domain decision -> action request -> runtime execution` 数据流。
  - 新能力优先落在 `src/construction/`、`src/spawning/`、未来的 `src/intel/`、`src/logistics/` 等领域边界。
  - 不回到 `src/Roles/*`、`src/managers`、`src/helpers` 这类成熟 bot 常见的大型分层。
  - 所有采用都要通过本地 TDD 行为切片重写，而不是直接移植实现。

## 结论先行

当前最值得吸收的不是“整套 bot 架构”，而是 4 类可局部落地的概念：

1. **construction 需要分阶段/限流**，避免一次性铺满 road backlog；
2. **spawn 需要 request/priority 中间层**，先有可排序请求，再扩展到 miner / hauler / defender；
3. **RCL3 规划应继续保持纯 planner**，先做 tower / extension 的小切片，而不是上 bunker/base planner；
4. **remote mining 之前必须先有 room intel / scoring**，并且要是只读、可测、低频运行的纯模块。

## 研究矩阵

| 仓库 | 证据与路径 | 可借鉴概念 | 本地决定 | 映射任务 |
| --- | --- | --- | --- | --- |
| `TooAngel/screeps` (644 ★, AGPL-3.0, JS) | README 明确写到“first fully automated open source codebase”；功能条目含 [Automatic base building](https://github.com/TooAngel/screeps/blob/master/doc/BaseBuilding.md)、[Mineral / market / reactions](https://github.com/TooAngel/screeps/blob/master/doc/Mineral.md)；代码路径含 [`src/brain_nextroom.js`](https://github.com/TooAngel/screeps/blob/master/src/brain_nextroom.js)、[`src/prototype_room_my.js`](https://github.com/TooAngel/screeps/blob/master/src/prototype_room_my.js)、[`src/brain_memory_market.js`](https://github.com/TooAngel/screeps/blob/master/src/brain_memory_market.js)、[`src/visualizer.js`](https://github.com/TooAngel/screeps/blob/master/src/visualizer.js)。 | 自动化覆盖面广；construction / remote / market 等能力都是“先有系统，再有功能细化”。 | **采纳概念，不采纳实现。** AGPL 明确要求我们不要复制代码；可借鉴“分阶段自动化”和“remote 先有 brain/intel”方向。 | `06-17-06-17-construction-throttling-phased-build`、`06-17-06-17-room-intel-remote-mining-scoring` |
| `bencbartlett/Overmind` (615 ★, MIT, TS) | README 直接描述 [Colony](https://github.com/bencbartlett/Overmind/blob/master/src/Colony.ts) / [Overlord](https://github.com/bencbartlett/Overmind/blob/master/src/overlords/Overlord.ts) / [Directive](https://github.com/bencbartlett/Overmind/blob/master/src/directives/Directive.ts)；关键路径还有 [`src/logistics/SpawnGroup.ts`](https://github.com/bencbartlett/Overmind/blob/master/src/logistics/SpawnGroup.ts)、[`src/logistics/LogisticsNetwork.ts`](https://github.com/bencbartlett/Overmind/blob/master/src/logistics/LogisticsNetwork.ts)、[`src/intel/RoomIntel.ts`](https://github.com/bencbartlett/Overmind/blob/master/src/intel/RoomIntel.ts)、[`src/logistics/RoadLogistics.ts`](https://github.com/bencbartlett/Overmind/blob/master/src/logistics/RoadLogistics.ts)、[`src/roomPlanner/RoomPlanner.ts`](https://github.com/bencbartlett/Overmind/blob/master/src/roomPlanner/RoomPlanner.ts)。 | colony 级 orchestration、spawn group / logistics network、中央信息模型、room planner。 | **采纳中间模型，拒绝总架构。** 最适合学习的是 `SpawnGroup` / `RoomIntel` / `RoomPlanner` 这些“单一问题模型”；不适合照搬 Overlord / Directive / Overseer 整体控制层，因为会冲掉本地 domain boundary。 | `06-17-06-17-spawn-request-priority-queue`、`06-17-06-17-rcl3-tower-extension-planner`、`06-17-06-17-room-intel-remote-mining-scoring` |
| `The-International-Screeps-Bot/The-International-Open-Source` (124 ★, MIT, TS) | 关键路径含 [`src/room/commune/spawning/spawnRequests.ts`](https://github.com/The-International-Screeps-Bot/The-International-Open-Source/blob/Main/src/room/commune/spawning/spawnRequests.ts)、[`src/room/commune/spawning/spawnRequestConstructors.ts`](https://github.com/The-International-Screeps-Bot/The-International-Open-Source/blob/Main/src/room/commune/spawning/spawnRequestConstructors.ts)、[`src/types/spawnRequest.ts`](https://github.com/The-International-Screeps-Bot/The-International-Open-Source/blob/Main/src/types/spawnRequest.ts)、[`src/room/remotePlanner.ts`](https://github.com/The-International-Screeps-Bot/The-International-Open-Source/blob/Main/src/room/remotePlanner.ts)、[`src/room/commune/remotesManager.ts`](https://github.com/The-International-Screeps-Bot/The-International-Open-Source/blob/Main/src/room/commune/remotesManager.ts)、[`src/room/construction/communePlanner.ts`](https://github.com/The-International-Screeps-Bot/The-International-Open-Source/blob/Main/src/room/construction/communePlanner.ts)、[`src/room/construction/towerPlanner.ts`](https://github.com/The-International-Screeps-Bot/The-International-Open-Source/blob/Main/src/room/construction/towerPlanner.ts)；生成文档还能看到 [`docs/classes/SpawnRequestsManager.html`](https://github.com/The-International-Screeps-Bot/The-International-Open-Source/blob/Main/docs/classes/SpawnRequestsManager.html)、[`docs/classes/RemotesManager.html`](https://github.com/The-International-Screeps-Bot/The-International-Open-Source/blob/Main/docs/classes/RemotesManager.html)、[`docs/classes/CommunePlanner.html`](https://github.com/The-International-Screeps-Bot/The-International-Open-Source/blob/Main/docs/classes/CommunePlanner.html)、[`docs/classes/TowerManager.html`](https://github.com/The-International-Screeps-Bot/The-International-Open-Source/blob/Main/docs/classes/TowerManager.html)。 | 当前开源 TS bot 里较接近“可拆分的小型 planner / request / remote 子系统”。 | **优先采纳“request shape”和“planner 划分”，拒绝 commune 级全栈管理层。** 本地可以吸收 `spawnRequest`、`towerPlanner`、`remotePlanner` 这种 typed boundary；不应引入 `commune` 总管理架构。 | `06-17-06-17-spawn-request-priority-queue`、`06-17-06-17-rcl3-tower-extension-planner`、`06-17-06-17-room-intel-remote-mining-scoring` |
| `bonzaiferroni/bonzAI` (108 ★, license 未声明, TS) | README / wiki 方向指向 Operation / Mission；关键路径含 [`src/ai/operations/Operation.ts`](https://github.com/bonzaiferroni/bonzAI/blob/master/src/ai/operations/Operation.ts)、[`src/ai/operations/AutoOperation.ts`](https://github.com/bonzaiferroni/bonzAI/blob/master/src/ai/operations/AutoOperation.ts)、[`src/ai/missions/Mission.ts`](https://github.com/bonzaiferroni/bonzAI/blob/master/src/ai/missions/Mission.ts)、[`src/ai/SpawnGroup.ts`](https://github.com/bonzaiferroni/bonzAI/blob/master/src/ai/SpawnGroup.ts)、[`src/ai/operations/MiningOperation.ts`](https://github.com/bonzaiferroni/bonzAI/blob/master/src/ai/operations/MiningOperation.ts)、[`src/ai/missions/MiningMission.ts`](https://github.com/bonzaiferroni/bonzAI/blob/master/src/ai/missions/MiningMission.ts)、[`src/ai/missions/SurveyMission.ts`](https://github.com/bonzaiferroni/bonzAI/blob/master/src/ai/missions/SurveyMission.ts)、[`src/ai/missions/TerminalNetworkMission.ts`](https://github.com/bonzaiferroni/bonzAI/blob/master/src/ai/missions/TerminalNetworkMission.ts)。 | operation / mission 分层、survey / mining / terminal 等能力包。 | **只保留“任务拆分思路”，不采纳代码结构。** 仓库未显式声明 license，默认更保守；而且 `Operation/Mission` 会把本地 domain boundary 重新包装成上层框架，当前不值得引入。 | 仅作为“未来 logistics / market / remote 可继续研究”的远期参考；**不直接映射当前四个任务的实现结构** |
| `ScreepsQuorum/screeps-quorum` (162 ★, MIT, JS) | 关键路径含 [`src/programs/empire/intel.js`](https://github.com/ScreepsQuorum/screeps-quorum/blob/master/src/programs/empire/intel.js)、[`src/extends/room/intel.js`](https://github.com/ScreepsQuorum/screeps-quorum/blob/master/src/extends/room/intel.js)、[`src/extends/room/economy.js`](https://github.com/ScreepsQuorum/screeps-quorum/blob/master/src/extends/room/economy.js)、[`src/extends/room/logistics.js`](https://github.com/ScreepsQuorum/screeps-quorum/blob/master/src/extends/room/logistics.js)、[`src/extends/room/territory.js`](https://github.com/ScreepsQuorum/screeps-quorum/blob/master/src/extends/room/territory.js)、[`src/programs/spawns.js`](https://github.com/ScreepsQuorum/screeps-quorum/blob/master/src/programs/spawns.js)、[`src/programs/city.js`](https://github.com/ScreepsQuorum/screeps-quorum/blob/master/src/programs/city.js)。 | room intel / economy / logistics / territory 彼此分离，说明 remote 决策前先有 intel/economy 模型是成熟路线。 | **采纳“intel 先于 remote execution”的方向，拒绝 `programs/*` 总控层。** 可以学习指标选型与模块切分，但不引入 empire program scheduler。 | `06-17-06-17-room-intel-remote-mining-scoring`；次要影响 `06-17-06-17-spawn-request-priority-queue` 的后续 logistics 扩展 |

## 采纳清单（明确采用）

### 1. Construction 采用“候选生成与优先级/限流分离”

证据来源：

- TooAngel 的 base building / automatic construction 方向；
- Overmind 的 `RoomPlanner`、`RoadLogistics`；
- The International 的 `communePlanner`、`towerPlanner`。

本地采用方式：

- 继续让 `src/construction/` 只产出纯 decision；
- 保留现有 deterministic candidate generation；
- 新增一层**phase / priority throttle**，先 extension / tower / container，再 roads；
- road backlog 必须有 active-site 上限，避免一次性铺满。

直接映射：`06-17-06-17-construction-throttling-phased-build`。

### 2. Spawning 采用“typed request -> priority selection -> SpawnDecision”

证据来源：

- Overmind 的 `SpawnGroup.ts`；
- The International 的 `spawnRequests.ts`、`spawnRequestConstructors.ts`、`spawnRequest` type；
- bonzAI 的 `SpawnGroup.ts` 仅作为次要旁证。

本地采用方式：

- 在 `src/spawning/` 内部引入轻量 `SpawnRequest`；
- 先覆盖 survival worker 与 RCL2 development worker 两类请求；
- 对外仍返回当前 `SpawnDecision`，不把请求系统泄漏到 runtime；
- 仍使用 runtime capture 的 body cost，不回退到硬编码成本表。

直接映射：`06-17-06-17-spawn-request-priority-queue`。

### 3. RCL3 规划采用“tower 作为 construction planner 的下一个结构切片”

证据来源：

- The International 的 `towerPlanner.ts`；
- Overmind 的 `RoomPlanner.ts`；
- TooAngel 的自动 base building / defense 能力说明。

本地采用方式：

- 不建 bunker planner；
- 只扩展 `ConstructionStructureType`、controller structure limits、tower candidate selection；
- tower decision 仍通过 runtime 的 `createConstructionSite` 执行；
- tower placement 必须 deterministic、可测试、与现有 extension/container/road slice 兼容。

直接映射：`06-17-06-17-rcl3-tower-extension-planner`。

### 4. Remote 采用“intel / scoring 先行，execution 后置”

证据来源：

- Overmind 的 `RoomIntel.ts`；
- The International 的 `remotePlanner.ts`、`remotesManager.ts`、`scout.ts`；
- Quorum 的 `intel.js` / `territory.js` / `economy.js`；
- TooAngel 的 `brain_nextroom.js` 方向。

本地采用方式：

- 先做只读、纯函数的 `room-intel` / remote candidate scoring；
- 输入只能来自 runtime / scout 边界捕获的 snapshot；
- 评分维度限定为 source count、distance、owner/reservation、hostile risk、keeper risk、unknown data policy；
- 执行层（claimer / reserver / miner / hauler）全部后置。

直接映射：`06-17-06-17-room-intel-remote-mining-scoring`。

## 拒绝 / 延后清单（明确不采用）

### A. 不整体移植 Overmind / TooAngel / The International 的总架构

原因：

- 本地已经明确约束了 domain boundary；
- `src/managers`、`src/Roles/*`、全局 Overseer / Commune / Program scheduler 都会破坏当前“薄 runtime + kernel + 纯 planner”结构；
- 当前代码规模仍在单房早期 bootstrap，直接导入 empire 级架构会让测试范围与 CPU 风险一起膨胀。

### B. 不在第一波任务里引入 market / terminal / labs / reactions / power creeps

原因：

- TooAngel / bonzAI 的这些模块证明了成熟 bot 会走到这里，但它们依赖更强的 economy、intel、spawn、logistics 基础；
- 目前本地仍缺 construction backpressure、spawn request、RCL3 planner、remote intel 这几块基础件。

### C. 不采用未声明 license 的 bonzAI 实现细节

原因：

- GitHub metadata 未给出 SPDX license；
- 因此 bonzAI 只能作为“概念参考”，不能作为可拷贝实现来源。

### D. 不让 remote / logistics 变成高频全图扫描系统

原因：

- `.trellis/spec/runtime/cpu-budget.md` 明确要求：pathfinding、room scanning、remote mining、global route search 都必须说明频率、预算、低 bucket 行为；
- 所以 room intel / remote scoring 必须默认低频、基于 scout 更新、可缓存，而不是每 tick 全量重算。

## 对本地后续任务的优先级建议

### P1 — `06-17-06-17-construction-throttling-phased-build`

**优先级最高。**

原因：

- 已有 live 证据表明 construction backlog 过大；
- 改动局部、纯 planner、低风险、收益立刻可见；
- 也是后续 tower / roads / logistics 规划继续扩展前的必要护栏。

外部证据支撑：TooAngel base building、Overmind `RoomPlanner` / `RoadLogistics`、The International `communePlanner`。

### P2 — `06-17-06-17-spawn-request-priority-queue`

**第二优先。**

原因：

- 这是未来 miner / hauler / defender / remote worker 的基础抽象；
- 能在不改变 runtime 接口的前提下，为后续角色拆分建立排序模型；
- 比直接做新 role 更符合当前项目的 domain boundary。

外部证据支撑：Overmind `SpawnGroup`、The International `spawnRequests*`、bonzAI `SpawnGroup`。

### P3 — `06-17-06-17-rcl3-tower-extension-planner`

**第三优先。**

原因：

- 与当前 RCL2 -> RCL3 的自然发展顺序一致；
- 依赖 construction planner 已具备更好的 phase/priority 语义；
- 可以继续保持“纯 planner + runtime execution”模式，不需要引入 defense manager。

外部证据支撑：The International `towerPlanner`、Overmind `RoomPlanner`、TooAngel automatic base building。

### P4 — `06-17-06-17-room-intel-remote-mining-scoring`

**第四优先。**

原因：

- 这是 remote mining 的前置研究型基础，但对当前单房 bootstrap 的即时收益低于前 3 项；
- 一旦有 spawn request 基础，就能更自然地把 scored remotes 映射到未来 remote worker requests；
- 也是进入 `src/intel/` 新领域最干净的起点。

外部证据支撑：Overmind `RoomIntel`、The International `remotePlanner` / `remotesManager`、Quorum `intel` / `territory`、TooAngel `brain_nextroom`。

### P5 — 后续新任务：logistics role split / dedicated miners-haulers

**建议在 P2 + P4 之后再开。**

原因：

- 没有 spawn request priority，就无法优雅表达 miner / hauler / refiller 的竞争；
- 没有 room intel / remote scoring，就容易把 remote worker 需求写成临时分支；
- 这类任务届时更适合落在 `src/logistics/` 或 `src/creeps/` 的明确边界，而不是再造通用 manager 框架。

## 本次研究对现有子任务的映射检查

- `06-17-06-17-construction-throttling-phased-build`：与外部 construction phasing 证据一致；
- `06-17-06-17-spawn-request-priority-queue`：与 `SpawnGroup` / `spawnRequests` 证据一致；
- `06-17-06-17-rcl3-tower-extension-planner`：与 `towerPlanner` / room planner 证据一致；
- `06-17-06-17-room-intel-remote-mining-scoring`：与 `RoomIntel` / `remotePlanner` / `intel` 证据一致。

结论：当前子任务拆分方向是对的，不需要改成“整包式 mature bot transplant”。

## 引用来源

### 本地文档

- `AGENTS.md`
- `.trellis/workflow.md`
- `.trellis/tasks/06-17-06-17-mature-bot-research-roadmap/prd.md`
- `.trellis/tasks/06-17-06-17-mature-bot-research-roadmap/design.md`
- `.trellis/tasks/06-17-06-17-mature-bot-research-roadmap/implement.md`
- `.trellis/spec/research/index.md`
- `.trellis/spec/research/player-code-research.md`
- `.trellis/spec/runtime/index.md`
- `.trellis/spec/runtime/domain-boundaries.md`
- `.trellis/spec/runtime/cpu-budget.md`
- `.trellis/spec/testing/index.md`
- `docs/references.md`
- `docs/architecture.md`
- 四个子任务的 `prd.md` / `design.md` / `implement.md`

### 外部仓库

- TooAngel: <https://github.com/TooAngel/screeps>
- Overmind: <https://github.com/bencbartlett/Overmind>
- The International Open Source: <https://github.com/The-International-Screeps-Bot/The-International-Open-Source>
- bonzAI: <https://github.com/bonzaiferroni/bonzAI>
- Screeps Quorum: <https://github.com/ScreepsQuorum/screeps-quorum>

### 外部元数据说明

- stars / forks / license / default branch / pushed_at 来自 2026-06-17 的 GitHub repository API 查询。
- README / 路径证据来自对应仓库的 `README`、源码路径与生成文档路径查询。
