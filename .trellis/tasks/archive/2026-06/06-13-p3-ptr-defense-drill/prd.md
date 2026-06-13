# P3 PTR defense drill

## Goal

在 PTR 环境验证 P3 defense fallback 的真实运行边界：先尝试在 PTR 复刻当前主线房间，再确认代码可部署、可读回、可自然 tick，并在具备 owned room 与 hostile 注入条件时执行一次受控攻防演练，观察 hostile 捕获、`roomUnsafe` 信号、safe mode decision 与 runtime 执行是否符合 P3 设计。

如果 PTR 房间复刻或 hostile 创建不可行，本任务必须记录阻塞事实；随后才允许回退到本地 official screeps-server fixture 验证真实引擎下的 P3 防御行为，但本地结果不能伪装成 PTR 攻防成功。

## Parent

- `.trellis/tasks/06-12-survival-fallback-roadmap-p0-p5`

## Confirmed Context

- P3 defense fallback 已完成 live 部署，并已有 unit / integration tests 覆盖 hostile 分类、safe mode decision、runtime 捕获和执行边界。
- 现有 PTR 脚本只覆盖代码 deploy / readback；不能证明自然 tick，也不能创建 hostile。
- `docs/game-state.md` 记录的上次 PTR 状态为无 owned room，Chrome PTR UI 显示 `Select your room`，因此当时无法观察自然 tick。
- 用户确认当前 PTR 服务器上还没有房间，要求先尝试复刻主线服务器上的房间，实在不行再回退本地服务器。
- 当前主线复刻目标来自 `docs/game-state.md`：`shard1 / W51N21`，`Spawn1` at `35,23`，controller RCL `2`，5 个 RCL2 extension construction sites，5 个 worker。
- 本轮 PTR API 探测因 `fetch failed` 未能确认当前 PTR account、room、shard、code 状态。

## Requirements

1. PTR feasibility gate
   - 使用 `screeps.ptr.json` 与 PTR API 只读取必要状态，不输出 token。
   - 读取 account、shards、owned rooms、branch code hash 与自然 tick 证据。
   - 没有 owned room 时先尝试通过 PTR 官方能力复刻主线房间，不直接进入本地 fallback。
   - 无法确认 code readback 或自然 tick 时停止 hostile drill，先修复 PTR 可观测性。

2. Main room replication on PTR
   - 复刻目标是 `shard1 / W51N21`、spawn `Spawn1`、位置 `35,23`。
   - 只允许在 PTR API / PTR UI 的官方房间创建能力内建立房间。
   - 不能复制 live 数据库、不能修改 live 房间、不能把主线 token 用于 PTR 操作。
   - 如果 PTR 的同 shard / room / spawn 坐标不可用，应记录具体 API/UI 响应和 blocked 原因。

3. Controlled attacker condition
   - 只允许使用 PTR 官方能力或已明确授权的测试账号/机制创建 hostile。
   - 不使用 live server 创建敌对单位，不消耗 live safe mode，不读取或复用未授权 cookie / token。
   - 如果 hostile 创建依赖非公开 GM 能力、第二账号或浏览器人工状态，必须先记录依赖并等待确认。

4. Defense observation
   - 演练必须观察 P3 runtime 捕获 hostile owner、body、hits、position。
   - 演练必须观察 planner 标记 room unsafe，并对 near-core damage/dismantle threat 产出 safe mode decision。
   - 只有在 PTR safe mode charge 风险可接受且执行边界已确认时，才允许实际调用 `controller.activateSafeMode`。
   - 如需避免消耗 PTR safe mode charge，必须把 dry-run 和 execute-run 明确分开，不用 flag 参数混合两种行为。

5. Local official server fallback
   - 只有 PTR 房间复刻失败，或 PTR 房间可运行但 hostile 创建不可行时，才进入本地 fallback。
   - fallback 使用本地 official screeps-server fixture 和自然 tick，不读取 live / PTR 凭据。
   - fallback fixture 应创建 owned room、near-core hostile threat 和可观察 safe mode / room unsafe 证据。
   - fallback 结果必须标记为本地 official server evidence，不替代 PTR 证据。

6. Evidence
   - 每次 PTR 读写操作记录 shard、room、branch、code hash、tick 证据与结果。
   - 阻塞、失败和成功都写入 `docs/game-state.md`，区分 PTR 事实、本地验证和推断。
   - 不提交凭据、PTR 私有配置或包含 token 的日志。

## Acceptance Criteria

- [x] `prd.md` 明确 PTR 可行性门槛、hostile 创建条件、safe mode charge 风险和禁止事项。
- [x] 当前 PTR account / shard / owned room / branch code 状态被重新验证，或记录网络/API 阻塞原因。
- [x] 若 PTR 无房间，先尝试复刻 `shard1 / W51N21` 的主线房间目标，并记录成功或 blocked 证据。
- [x] PTR hostile drill 当前 blocked：自然 tick 和授权 hostile 创建机制不具备，未伪造 PTR 成功。
- [x] PTR hostile 创建不具备条件时已进入本地 official screeps-server fallback，且未修改 live 行为。
- [x] `docs/game-state.md` 更新 PTR 演练或阻塞证据。
- [x] 不泄露或提交 token、cookie、PTR 私有配置。

## Out of Scope

- live production 攻防演练。
- 编写 offensive combat bot、defender spawning、kiting 或完整 combat simulator。
- 为绕过 PTR 限制引入兼容层、模式参数或临时攻击开关。
- 在未确认风险时消耗 live safe mode charge。
