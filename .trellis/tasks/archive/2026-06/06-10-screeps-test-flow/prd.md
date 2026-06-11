# 重构 Screeps 测试流程

## Goal

建立清晰的 Screeps 测试分层，让默认本地验证保持稳定、无凭据、低成本，同时为真实 Screeps engine 端到端测试和官方 PTR 冒烟验证预留明确入口。

## Requirements

- 默认 `pnpm check` 必须继续保持无 live 凭据、无官方在线环境依赖、无长期服务状态依赖。
- 当前先保留现有 compiled bundle 测试，但它应被定义为 bundle smoke，而不是完整 e2e。
- 本地 standalone server 端到端测试应作为独立验证入口，先跑通 PoC，用真实 Screeps engine 验证 compiled bundle 在带 owned room 和 owned spawn 的自然 tick 中加载、执行并写入 `Memory`，同时记录耗时与维护成本。
- 是否让本地 standalone server 端到端测试成为主要默认验证，必须基于实际运行耗时、安装成本和稳定性决定，不能在本任务中无数据地删除 bundle smoke。
- 官方在线 PTR 只作为显式手动或发布前冒烟验证环境，不进入默认本地门禁。
- 不接入本地 `screeps@ptr` 作为常规测试矩阵；只有官方 PTR 问题需要本地复现时再单独评估。
- live 主服验证仍保持显式操作，只用于部署后 readback 和自然 tick 观察。
- 本地 server PoC 默认只启用一个受控 bot 用户；第一版固定 fixture 名称为 `single-owned-spawn`。
- 后续本地 server e2e 增多时，`package.json` 只应暴露少量稳定套件入口，例如 smoke/full；具体行为 case 应由 runner 内部 registry 编排，避免为每个策略行为新增 package script。
- runner 内部可以支持本地调试用 case selection，但该选择只允许在同一 local official server e2e 边界内选择 case；不能用 mode/flag 在同一命令中切换 live、PTR、deploy、rollback 或其他环境/副作用边界。
- 本地 server PoC 第一版通过 server logs/status events 观察 heartbeat，并通过官方 runner `saveResultFinish` 状态事件观察 `Memory`；本地 HTTP API 通道留到后续任务。
- `test:screeps-server` 必须自行执行 `pnpm build`，不能只复用可能过期的 `dist/main.js`。
- `screeps@4.3.0` 必须安装/缓存在 `.screeps/server/package/`，不能加入根 `devDependencies`。
- 缓存版本不匹配时自动重建，但递归删除目标必须限制在 `.screeps/server/package/`。
- 本地 server PoC 必须基于明确成功/失败信号推进，watchdog timeout 只用于防止挂死，不能用固定等待时间作为通过条件。
- 本地 server PoC 不修改官方 server 包源码；需要 server 状态 hook 时，通过 run-scoped Screeps mod 写入本地状态文件，不通过 HTTP endpoint 作为主同步机制。
- 本任务参考 `screepers/screeps-server-mockup` / `screepers/screeps-server-test` 的 harness 思路，但先实现项目自有最小测试框架，不直接依赖或复制社区项目代码。

## Acceptance Criteria

- [x] 测试分层在项目文档中说明清楚：unit、integration、system、bundle smoke、本地 standalone server e2e、官方 PTR smoke、live smoke。
- [x] `package.json` 的脚本命名能区分默认验证、bundle smoke、本地 server e2e、PTR smoke 和 live 操作，不使用 mode/flag 在同一命令中切换环境；本地 server e2e 后续扩展通过 suite/case registry 控制脚本数量。
- [x] 默认 `pnpm check` 不依赖 Screeps token、官方 PTR、live 主服或本地长期运行的 Screeps server。
- [x] 现有 compiled bundle 覆盖被保留，直到本地 standalone server e2e 的实际成本被验证并记录。
- [x] 本地 standalone server e2e PoC 可以通过独立命令运行，并输出安装、启动、tick 观察和总耗时。
- [x] 官方 PTR 的用途、reset 风险和与本地 server e2e 的边界明确。
- [x] 文档不暗示 bundle smoke 等同于 live/runtime verification。

## Out of Scope

- 本任务不把本地 `screeps@ptr` 加入常规测试矩阵。
- 本任务不把官方 PTR 或 live 主服验证加入默认 `pnpm check`。
- 本任务不删除 bundle smoke；是否删除留到本地 standalone server e2e 成本数据稳定后再决定。
- 本任务不改变 live Screeps 部署凭据格式，除非 PTR smoke 脚本需要独立配置并经过单独设计。
- 本任务不实现多 bot 对抗或交互场景，只保留以后通过命名 fixture 和 runner case 开启的边界。
- 本任务不实现本地 HTTP API readback、本地 auth/token 生成，或 backend test endpoint 轮询。
- 本任务不通过 mod 修改游戏规则、tick duration、常量、对象处理、intent、terrain、room objects 或 player sandbox 行为。

## Behavior Slices

- Given the project scripts are inspected, when the test flow is documented, then each test layer has a single purpose and a distinct command.
- Given `pnpm check` is run locally, when no Screeps token or server is available, then the default gate still completes using only local deterministic checks.
- Given the compiled bundle test remains, when it is referenced by scripts or docs, then it is described as bundle smoke rather than complete e2e.
- Given local standalone server e2e is introduced, when `pnpm test:screeps-server` runs, then it starts an isolated official Screeps standalone server with an owned room and owned spawn, observes at least one natural tick from the compiled bundle, and reports timing/cost data.
- Given PTR verification is introduced or documented, when it is run, then it targets official PTR explicitly and cannot accidentally target live main world.

## Open Questions

- What maximum steady-state runtime is acceptable before local standalone server e2e can become the primary default verification gate?

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
