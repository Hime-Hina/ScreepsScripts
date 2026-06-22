# Mature bunker / base-planner 布局调研

## 研究范围与本地约束

- 研究日期：2026-06-22。
- 本文只记录“外部成熟布局证据 -> 本地可采纳约束 -> P2-P6 任务映射”，**不复制外部代码**。
- 任务目标来自：
  - `.trellis/tasks/06-22-mature-bunker-layout-survey/prd.md`
  - `.trellis/tasks/06-22-mature-bunker-layout-survey/design.md`
  - `.trellis/tasks/06-22-aggressive-road-lattice-bunker-rebuild-train/prd.md`
- 本地架构边界来自：
  - `.trellis/spec/research/player-code-research.md`
  - `.trellis/spec/runtime/domain-boundaries.md`
  - `.trellis/spec/runtime/cpu-budget.md`
- 因此所有采纳都必须满足以下硬约束：
  1. 保持 `runtime snapshot -> memory state -> kernel -> domain decision/request/intent -> runtime execution` 数据流。
  2. 研究产物只能转译成 `P2-P6` 的**本地约束**，不能导入 Overmind / Harabi / 论坛蓝图的总架构。
  3. 不新增 `src/managers` / `src/helpers` / 通用 ECS / 角色总控框架。
  4. 复杂几何、扫描、打分都必须注明频率、缓存和低 bucket 行为，不能默认每 tick 全房重算。
  5. 任何涉及现有 built structure 的迁移、拆除、替换，都必须保留 **design confirmation gate / operator gate / explicit user approval** 的措辞，不得在 P1-P4 自动落地。

## 结论先行

这轮调研最值得吸收的不是“标准 bunker 蓝图本身”，而是 5 组可以转译到本地任务链的约束：

1. **布局必须先保留通行骨架，再追求 60 extension 满配。** 成熟 bunker 会主动留出口、留对角空位、留 refill 通道，而不是把 extension 填满到最后一格。
2. **road-first 的真正目标不是美观，而是降低 refill / spawn 出口 / 核心物流拥堵。** 如果没有成熟 traffic library，就必须把“可通行性”转成静态评分和硬约束。
3. **成熟 planner 本质上是 anchor/stamp + 变换 + 几何评分，不是直接写死一套房间坐标。** 本地应把这点落到 P2/P3，而不是直接在 P4 写新 heuristics。
4. **现有房间迁移必须 build-before-destroy。** storage / spawn / tower / extension 的替换都要先有替代容量，再谈移除。
5. **成熟 bot 的 manager/queen/专用 traffic 系统不适合当前本地架构。** 本地只能吸收“它们在解决什么拥堵问题”，不能吸收对应的运行时组织方式。

## 来源与证据矩阵

| 来源 | 证据 | license posture | 提炼出的成熟概念 | 本地采用方式 |
| --- | --- | --- | --- | --- |
| Overmind bunker wiki / blog | `https://github.com/bencbartlett/Overmind/wiki/Bunkers`；`https://bencbartlett.github.io/blog/screeps-5-evolution` | Overmind 仓库经 GitHub API 查询为 **MIT**；但本任务仍只采纳概念，不复制实现 | bunker 中央核心、manager/queen attendant、拥堵是 compactness 的主要代价、RCL8 主 bunker 只放 **51/60** extension 以保留每边出口 | 采纳“保留出口/通道优先于塞满 extension”的思想；拒绝 manager/queen 和 traffic runtime 实现 |
| Overmind repo code source | `https://raw.githubusercontent.com/bencbartlett/Overmind/master/src/roomPlanner/RoomPlanner.ts` | 同上，MIT；但仅作为“planner shape”证据 | planner 具有 `bunkerData.anchor`、`mapsByLevel`、road/barrier/planner 协作，说明成熟方案是 anchor + staged maps，而不是单一坐标表 | 采纳为 P3/P4 的本地约束：stamp primitive、anchor、RCL staged output；不采纳其 colony/framework 结构 |
| Adam Laycock bunker migration notes | `https://alaycock.co.uk/2017/10/screeps-part-20-bunkers` | 个人博客文章；按概念参考处理，不复制代码/文本实现 | existing room bunker 迁移很慢；应先把 bunker 建起来，再移除错误位置结构；storage 是最难迁移对象；第二 spawn/替代容量是迁移前提 | 直接转成 P5/P6 的 operator gate：build-before-destroy、替代容量先行、明确 rollback 限制 |
| Harabi automated base planning | `https://sy-harabi.github.io/Automating-base-planning-in-screeps` | 文章本身按概念参考处理；文中算法 utils 仓库 GitHub API 未给出 SPDX license，故 **不能当作可拷贝实现来源** | distance transform 选开阔区、靠 controller/source 的 anchor 选择、floodfill 可达性、核心 stamp、控制器升级区预留 | 采纳为 P2/P3 几何约束与指标；不直接搬算法代码 |
| Screeps forum blueprint feedback | `http://screeps.com/forum/topic/2436/room-blueprint-feedback` | 论坛讨论；只作经验性证据 | 讨论集中在 diagonal openness、tower 是否居中、terminal/lab 距离、extension refill traffic、11x11/13x13 体积取舍 | 采纳为 P2/P3 的评分维度；不把论坛蓝图当成最终模板 |

## 成熟概念 -> 本地约束翻译

### 1. “51/60 extension 也值得” -> 本地必须保留开放骨架

外部证据：

- Overmind 明确说明：主 bunker 在 RCL8 只放 `51/60` extension，以换取 **每边至少一个出口** 和更紧凑的核心。
- 论坛反馈也反复围绕“tower 是否居中”“extension refill traffic 是否被堵死”讨论，说明成熟布局不是单纯追求满格容量。

本地翻译：

- **P2** 的候选布局输出不能只统计 extension 总数，还必须同时展示：
  - 每侧出口保留情况；
  - 对角开放位数量；
  - 从 spawn / storage 到 extension pocket 的 refillAccess；
  - 被封死的 alley / dead-end 数量。
- **P3** 的打分器必须把以下维度设为硬约束或高权重惩罚：
  - 保留开放对角；
  - 至少一条不被 extension 墙封死的主通道；
  - spawn 出口可逃逸；
  - extension pocket 至少具备可服务 road adjacency。
- **P4** 不应把“RCL8 = 房内硬塞满 60 extension”作为目标；允许采用“核心内 + 外部 garden / pocket”混合容量方案。

本地决定：**采纳，但不照抄 51/60 这个具体数字。** 具体数字应由本地 scoring 和 W51N21 几何决定；采纳的是“通行骨架优先于最后 9 个 extension”。

### 2. “compact bunker 的代价是拥堵” -> 本地用静态服务性指标替代高级 traffic runtime

外部证据：

- Overmind 明确把 traffic management 视为 bunker 成败关键，并提到 spawn 只有两个出口时必须解决 baby creep 出口堵塞。
- 论坛蓝图也指出：某些 bunker 只有在 refill extensions 时才需要复杂 traffic management，这恰好说明 refillAccess 是布局评价核心。

本地翻译：

- 当前项目没有也不应在本任务链中引入 Overmind 风格 movement library、queen/manager attendant、递归 `vacatePos` 运行时机制。
- 因此必须把“潜在拥堵”提前转译为**可离线验证**的布局指标：
  - spawn 出口数量；
  - extension refill 邻接关系；
  - road continuity；
  - pocket serviceability；
  - 核心设施与 roads 的 range-1/range-2 可达性；
  - 被 roads 包围但无法周转的单点瓶颈。
- 这类指标应该在 **P2 输出可视化** 和 **P3 打分** 中体现，而不是等到 P4/P5 live 时才发现堵路。

本地决定：**采纳问题定义，拒绝运行时实现。** 我们要解决拥堵问题，但方式是“静态几何评分 + staged planner + rollout review”，不是导入交通框架。

### 3. “anchor/stamp + staged maps” -> 本地 P3 必须是 primitive 层，不允许直接把 P4 写成房间特判

外部证据：

- Overmind `RoomPlanner.ts` 中存在 `bunkerData.anchor` 和 `mapsByLevel`，说明成熟 planner 的产物是“锚点 + 分 RCL 的结构图”。
- Harabi 文章把 base planning 拆为 distance transform、起点选择、core stamp、controller 区域、floodfill 可达性等阶段。

本地翻译：

- **P2** 先产出 read-only 房间几何快照与候选可视化，不碰 construction planner。
- **P3** 必须承担以下职责：
  - relative-coordinate stamp primitive；
  - rotate / reflect / translate；
  - road / extension pocket / core slot / open diagonal / reserved exit 表达能力；
  - terrain fit、existing structure compatibility、migration cost、serviceability scoring；
  - 分 RCL 的 staged 输出能力。
- **P4** 只能消费 P3 的 primitive / score 结果，不能重新在 construction planner 内硬编码一套 W51N21 专属坐标逻辑。

本地决定：**强采纳。** 这是整个任务链最核心的研究结论之一。

### 4. “选址先看几何，再看美观” -> 本地 P2 必须提供 controller/source/blocked-terrain 视图和指标

外部证据：

- Harabi 先用 distance transform 找足够开阔的区域，再偏向 controller/source 较近的 anchor，并用 floodfill 判断可达性。
- 论坛蓝图反馈表明：同一套 bunker 能否旋转/镜像进入不同地形，本身就是成熟设计的关键价值。

本地翻译：

- **P2** 输出中必须包含：
  - terrain、wall/edge、controller/source/mineral、existing structures/construction sites；
  - 候选 anchor 的开阔度；
  - controller/source 距离；
  - 可旋转/镜像后的适配情况；
  - room 内不可兼容的既有结构热点。
- **P3** 评分需要明确：
  - 地形贴合度；
  - 与既有核心/road 的兼容性；
  - 若未来迁移，候选相对现有布局的迁移成本。
- 所有这些分析必须遵守 `.trellis/spec/runtime/cpu-budget.md`：
  - 不默认每 tick 全量扫描；
  - 允许按 snapshot / fixture / on-demand 运行；
  - 明确低 bucket 时直接跳过非关键布局分析。

本地决定：**强采纳。** 这是 P2 的主要验收语义来源。

### 5. “existing-room bunker migration 很慢” -> P5 只能做带门控的迁移计划，不能做自动拆迁

外部证据：

- Adam Laycock 明确写到：已有房间迁移到 bunker 时，通常是**先把新 bunker 尽量建起来，再移除不合位置的旧结构**；而且过程非常慢。
- 文中还强调 storage 迁移最困难，第二 spawn / 替代容量是旧结构拆除前的重要前提。

本地翻译：

- **P5** 必须把每个受影响结构分类成：
  - `keep`；
  - `migrate-later`；
  - `remove-site-only`；
  - 如未来需要，也可出现 `remove-built-only-after-replacement`。
- **P5** 对 built spawn / storage / tower / extension 的任何移除建议都必须满足：
  1. 已有替代容量；
  2. 用户显式批准；
  3. 输出回滚限制（代码回滚不能恢复已被摧毁的结构）。
- **P6** rollout 文档必须继续保留：
  - human review artifact；
  - deploy gate checklist；
  - stop conditions；
  - rollback path 仅限代码与流程，不伪装成“可恢复结构”的假回滚。

本地决定：**强采纳。** 这条约束直接决定 P5/P6 的安全边界。

### 6. “manager / queen / fast-filler / lab-attendant” -> 当前任务链只保留布局含义，不保留运行时组织方式

外部证据：

- Overmind bunker 依赖 manager、queen、lab adjacency、traffic library 才真正发挥紧凑布局优势。
- Harabi 也提到一些 bot 会用 fast filler stamp，但那依赖后续的物流/搬运行为。

本地翻译：

- 本地当前任务链的目标是 **layout planner**，不是 logistics architecture 重构。
- 因此：
  - **P2/P3/P4** 只需要保留“哪些位置需要高 refill serviceability”的几何事实；
  - 不引入 manager/queen creep 类型；
  - 不要求新增 dedicated filler runtime；
  - 不把 lab adjacency 当作本轮必需优化目标。

本地决定：**延后。** 可以在未来 logistics 任务重新研究，但不是 P2-P6 的验收前提。

## adopt / defer / reject 清单

### Adopt now

1. **开放骨架优先**：出口、对角开放位、主通道优先于满 extension。
2. **静态服务性评分**：refillAccess、road continuity、spawn egress、pocket serviceability。
3. **anchor/stamp/transform**：旋转、镜像、平移、RCL staged maps。
4. **geometry-first candidate review**：distance/open-area/controller-source proximity/floodfill style metrics。
5. **migration gates**：build-before-destroy、replacement capacity、explicit approval。

### Defer

1. manager / queen / dedicated fast-filler 运行时角色。
2. lab adjacency、boost while spawning 之类高阶 bunker 细节。
3. min-cut / barrier planner 的完整防御系统；本轮只保留“tower/core compactness 与开放出口的权衡”。
4. empire-scale 资源转运支持；本地单房/局部规划先行。

### Reject

1. **Reject 直接复制 bunker 蓝图坐标。** W51N21 地形、既有结构和 staged migration 条件都不同。
2. **Reject 导入 Overmind/成熟 bot 总架构。** 这会破坏本地 domain boundary。
3. **Reject 以 traffic runtime 能力为前提的布局假设。** 当前没有对应执行层，就不能假设它会自动成立。
4. **Reject 在 P4 之前把布局逻辑写成 room-specific heuristics。** 先有 P2/P3 再有 integration。
5. **Reject 未声明 license 的算法实现复制。** Harabi 文章关联的 utils 仓库缺少 SPDX license，只能学概念。

## 对 P2-P6 的本地约束映射

| Phase | 任务 | 来自成熟方案的约束翻译 | 本地必须避免的误用 |
| --- | --- | --- | --- |
| P2 | `06-22-room-geometry-layout-simulator` | 只读快照；输出候选 anchor、旋转/镜像适配、controller/source 距离、terrain fit、refillAccess、开放出口/对角、既有结构冲突热区；产物必须适合人类确认 | 不能直接生成 live 写操作；不能只看 extension 数量；不能省略 human-review candidate map |
| P3 | `06-22-road-lattice-stamp-primitives` | primitive 必须表达 road skeleton、extension pocket、core slot、reserved exits、open diagonals，并支持 transform / connectivity / scoring / migration cost；允许分 RCL 产物 | 不能把 W51N21 坐标硬编码进 planner；不能假定高级 traffic runtime 存在 |
| P4 | `06-22-rcl-staged-extension-garden-planner` | 用 P3 候选做 road-first garden 规划；优先 capacity-improving extension decisions；保留 RCL2/RCL3 bootstrap；RCL4+ 不强求“房内 60 满塞” | 不能在未确认候选前直接替换现有 heuristic；不能自动触发现有 built structure 迁移 |
| P5 | `06-22-aggressive-core-migration-safety-gates` | 迁移方案必须逐结构分类，遵守 build-before-destroy、replacement capacity、explicit user approval；storage/spawn/tower 是最高风险对象 | 不能自动拆 built structures；不能把代码回滚说成结构回滚；不能缺 operator gate |
| P6 | `06-22-layout-rollout-rehearsal-monitoring` | rollout 报告必须包含 dry-run diff、坐标核对、停止条件、监控字段、回滚限制；继续保留人类审批 gate | 不能把 dry-run 省略成口头说明；不能在未获批准前 deploy / console write / Memory write / PM2 restart |

## 推荐的任务链顺序含义校准

- **P2 先于 P3/P4** 是必要的：先把 W51N21 的真实几何和候选布局可视化，才能决定要支持哪些 primitive 和评分项。
- **P3 先于 P4** 是必要的：成熟方案的本质是 stamp + transform + scoring，如果跳过 P3，P4 很容易退化成一次性 heuristics。
- **P5 必须晚于 P4**：只有当 read-only candidate 和 planner integration 都稳定之后，才有资格讨论 built structure 迁移。
- **P6 必须最后**：它不是实现任务，而是把 design confirmation gate、operator approval、dry-run、monitoring 串成可审查 rollout 包。

结论：当前 P2-P6 拆分是合理的，不需要改成“先写 aggressive planner，再补安全门”的顺序。

## 对后续实现的明确要求

1. **P2/P3 先做读模型与评分模型，不碰 runtime 写边界。**
2. **P4 只做 planner integration，不做 demolition。**
3. **P5/P6 继续把 destructive live operation 写成 optional / gated / approval-required。**
4. **如果某个成熟概念需要 manager/queen/traffic runtime 才成立，就默认降级成静态评分项，而不是直接采用。**
5. **所有 layout 候选都要能解释“为什么比当前布局更不容易堵”，不能只解释“更多 extension 更整齐”。**

## 引用来源

### 本地文档

- `.trellis/tasks/06-22-mature-bunker-layout-survey/prd.md`
- `.trellis/tasks/06-22-mature-bunker-layout-survey/design.md`
- `.trellis/tasks/06-22-mature-bunker-layout-survey/implement.md`
- `.trellis/tasks/06-22-aggressive-road-lattice-bunker-rebuild-train/prd.md`
- `.trellis/tasks/06-22-room-geometry-layout-simulator/prd.md`
- `.trellis/tasks/06-22-road-lattice-stamp-primitives/prd.md`
- `.trellis/tasks/06-22-rcl-staged-extension-garden-planner/prd.md`
- `.trellis/tasks/06-22-aggressive-core-migration-safety-gates/prd.md`
- `.trellis/tasks/06-22-layout-rollout-rehearsal-monitoring/prd.md`
- `.trellis/spec/research/player-code-research.md`
- `.trellis/spec/runtime/domain-boundaries.md`
- `.trellis/spec/runtime/cpu-budget.md`
- `docs/references.md`

### 外部来源

- Overmind bunker wiki: <https://github.com/bencbartlett/Overmind/wiki/Bunkers>
- Overmind blog “Screeps #5: Evolution”: <https://bencbartlett.github.io/blog/screeps-5-evolution>
- Overmind `RoomPlanner.ts`: <https://raw.githubusercontent.com/bencbartlett/Overmind/master/src/roomPlanner/RoomPlanner.ts>
- Adam Laycock “Screeps Part 20 – Bunkers”: <https://alaycock.co.uk/2017/10/screeps-part-20-bunkers>
- Harabi “Automating Base Planning in Screeps”: <https://sy-harabi.github.io/Automating-base-planning-in-screeps>
- Screeps forum “Room blueprint feedback”: <http://screeps.com/forum/topic/2436/room-blueprint-feedback>

### 外部元数据说明

- `bencbartlett/Overmind` license 通过 GitHub repository API 查询为 `MIT`。
- `sy-harabi/screeps-algorithgm-utils` GitHub repository API 未返回 SPDX license，因此相关算法实现只能视为无明确许可的概念参考。
- 本文所有外部材料都按“研究概念 -> 本地重写约束”处理，不构成代码移植建议。
