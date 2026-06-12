# RCL2 economic infrastructure loop

## Goal

把 `shard1 / W51N21` 的 RCL2 可建造设施转化为稳定经济增益：自动规划并建造 5 个 extension，补能 spawn/extension，保持 worker 自持循环，并为后续 road、container、tower 切片留下清晰边界。

## User Value

- RCL2 的 5 个 extension 建成后，房间能量容量从 `300` 提升到 `550`，后续 worker body 可以明显增强。
- 自动建造和补能减少手动操作，避免“已解锁设施但代码不会利用”的停滞。
- 分阶段推进可以在安全期内提高产能，同时避免过早建 road/container/rampart 带来维护负担。

## Confirmed Facts

- 当前任务由用户批准创建；用户要求先参考其他成熟玩家方案，再调整计划。
- 当前 live room 是 `shard1 / W51N21`，controller RCL2，spawn 为 `Spawn1` at `35,23`。
- 当前 live readback 显示 `Spawn1` 已能孵化 `[WORK, CARRY, CARRY, MOVE, MOVE]` early worker。
- 当前源码只有 bootstrap 行为：spawn worker、harvest source、refill spawn、upgrade controller。
- 当前源码没有 construction site planner、`Room.createConstructionSite`、`Creep.build`、extension refill、repair、container、road、tower 行为。
- 现有架构要求 Screeps globals 只在 runtime boundary 读取；策略模块必须通过纯 snapshot 输入和 decision 输出实现。

## External Research Notes

- Overmind 将 AI 拆成 colony、overlord、directive 等层级，并有 RoomPlanner、RoadLogistics、SpawnGroup 等独立领域；这说明成熟方案会分离规划、物流、孵化和执行，但本仓库当前不应一次引入完整 colony 框架。Source: [Overmind README](https://github.com/bencbartlett/Overmind), [Overmind docs](https://bencbartlett.com/overmind-docs/)
- Ben Bartlett 的 room planning 文章说明成熟 room planner 会先规划 cluster，再计算连接 hatchery、upgrade site、mining site 的 road，并周期性检查缺失结构后放 construction site。对当前任务的调整：先做最小 planner 和补能，不做完整人工 flag/session planner。Source: [Interior Design](https://bencbartlett.com/blog/screeps-2-interior-design/)
- TooAngel 的设计强调自动生成 room layout，并按当前 RCL 建造结构；它是完整自动化 bot，但范围包含 expansion、combat、market，不适合本轮直接复制。Source: [TooAngel Design](https://tooangel.github.io/screeps/doc/Design.html), [TooAngel README](https://github.com/TooAngel/screeps)
- KasamiBot 的说明强调 extension/spawn 优先、road network 连接 source/outpost、container 作为 RCL4 storage 前的过渡，并把 repair 交给 janitor/basebuilder。对当前任务的调整：extension/refill 是第一优先，road/container/repair 应拆成后续切片。Source: [KasamiBot features](https://kasami.github.io/kasamibot/features.html)
- Harabi 的自动基地规划流程从 distance transform、core placement、upgrade area、floodfill、infrastructure、min-cut rampart、tower placement 逐步推进。对当前任务的调整：记录未来方向，但 RCL2 不做 distance transform/min-cut/rampart。Source: [Automating Base Planning in Screeps](https://sy-harabi.github.io/Automating-base-planning-in-screeps/)
- Screeps 官方文档确认 RCL2 最多 5 个 extension，每个 50 energy，extension 建造成本 3000，road 建造成本 300，container 建造成本 5000；construction site 通过 `Room.createConstructionSite` 创建，creep 通过 `Creep.build` 建造。Source: [Screeps API](https://docs.screeps.com/api/)

## Requirements

0. Task decomposition
   - Parent task owns overall RCL2 economic infrastructure acceptance and final integration review.
   - `06-12-rcl2-worker-energy-flow-decisions` and `06-12-rcl2-extension-planner-decisions` may be implemented in parallel because their intended write sets are disjoint.
   - `06-12-rcl2-runtime-integration-live-verification` depends on the first two children and must integrate them after their pure decision contracts are ready.

1. RCL2 extension planner
   - 自动为 owned room 规划最多 5 个 extension construction site。
   - 规划位置必须基于当前 room snapshot，不能依赖 hard-coded live-only object IDs。
   - 首版允许使用 spawn 周边的确定性候选点；不得阻塞 spawn、source、controller 或已存在结构。
   - 若已有 extension 或 extension construction site，应只补齐缺口，不重复建 site。

2. Energy structure refill
   - worker 满能量后应优先补满 spawn 和 extension。
   - 补能目标应按 room 内未满 energy structure 的稳定顺序选择。
   - 旧的 `refillSpawn` 语义应提升为“refill energy structure”，而不是额外堆一个 extension 特例。

3. Builder behavior
   - worker 有能量且没有未满 energy structure 时，应优先 build construction site。
   - 没有 construction site 时，继续 upgrade controller。
   - worker 空包时继续按确定性 source 分配采集。

4. Runtime boundary
   - runtime 负责读取 structures、construction sites、terrain/positions，以及执行 `createConstructionSite` 和 `build`。
   - 策略模块只接收 snapshot，不直接读 Screeps globals。

5. Safety and scope
   - 本轮不实现 road planner、container mining、repair、rampart/wall、tower、miner/hauler 分工。
   - 不引入完整 base planner、distance transform、min-cut、remote mining、market、combat。
   - 不用 mode/flag/options 参数切换特殊行为；不同业务动作应是明确 decision 类型。

## Acceptance Criteria

- [x] Unit tests prove extension planner creates only missing RCL2 extension sites and skips occupied/invalid candidates.
- [x] Unit tests prove worker full energy priority is: refill spawn/extension -> build construction site -> upgrade controller.
- [x] Integration tests prove runtime boundary calls `Room.createConstructionSite`, `Creep.transfer` to extension/spawn, and `Creep.build` on construction sites.
- [x] Existing bootstrap spawn/harvest/refill/upgrade behavior remains covered.
- [x] `pnpm check` passes.
- [x] `pnpm test:screeps-server` passes or a concrete blocker is recorded.
- [x] If deployed, `pnpm deploy:screeps` and `pnpm verify:live:screeps` pass, and `docs/game-state.md` records live readback.

## Out of Scope

- Full room planner with distance transform/floodfill/min-cut.
- Roads, containers, repairs, ramparts, walls, towers.
- Dedicated miner/hauler roles.
- Multiple rooms, remotes, reservation, combat, market, minerals.

## Open Question

- Resolved: user approved first batch scope with `energy-structure-refill`, `extension-construction-planner`, and `builder-behavior`; road/container/repair/tower remain follow-up tasks.
