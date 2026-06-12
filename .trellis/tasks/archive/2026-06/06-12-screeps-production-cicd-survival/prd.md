# Screeps 生产逻辑与 CI/CD 存活闭环

## Goal

在 `shard1 / W51N21` 的安全期内，把当前自持 bootstrap 推进为可测试、可部署、可回滚、可观察的早期单房间生产循环：更快升级 controller，保持 spawn 续产能力，补齐默认 CI 门禁，并通过本地验证、Screeps 部署 readback 与生产观察记录证明变更可运行。

## Confirmed Facts

- 当前 active production room 是 `shard1 / W51N21`，spawn 是 `Spawn1` at `35,23`。
- `docs/game-state.md` 记录 controller RCL `1`、safe mode until tick `71622765`、safe mode available `0`。
- 当前 live 自持证据：第一只 worker 已采集、回补 spawn，并触发第二只 worker 孵化；最终读回两只 worker 已运行。
- 当前 runtime 只有 bootstrap 行为：按总 creep 数维护 3 个 `[WORK,CARRY,MOVE]` worker，worker 满包后先补 spawn，spawn 满后升级 controller。
- 当前 worker source 选择总是取同房间第一个 source，未利用第二个 source。
- 当前 `Memory` schema 只有项目 root 与 `schemaVersion`；没有 creep、room、spawn 子树。
- 当前 `pnpm check` 已覆盖 typecheck、lint、format、unit/integration coverage、system 和 bundle smoke。
- 当前 `pnpm test:screeps-server` 是显式本地官方 server e2e，不属于默认 `pnpm check`。
- 当前没有 `.github/workflows/`；`docs/development.md` 明确记录 CI 和 hooks 尚未配置。
- 已有显式 live/PTR 运维命令：`deploy:screeps`、`verify:live:screeps`、`rollback:screeps`、`deploy:ptr:screeps`、`verify:ptr:screeps`、`rollback:ptr:screeps`。
- 项目规范要求默认 CI 不读取 Screeps 凭据，不运行 live/PTR/rollback/deploy 命令。

## Requirements

- 生产逻辑必须保持 TypeScript-only，并继续让 `src/main.ts` 只调用完整 tick 操作。
- Screeps 全局读取和直接 game action 执行仍只属于 `src/runtime/`。
- 本轮生产逻辑只面向当前早期单房间 bootstrap，不引入多房间、远程采矿、防御、市场或完整 colony 框架。
- 提升 worker 生产与工作分配，但不重建旧的 role-folder 架构，不引入为特殊情况服务的 mode/flag/options 分支。
- worker 应更稳定地利用当前房间两处 source，避免所有 worker 永远压到第一个 source。
- spawn 决策应以早期存活和 controller 快速升级为目标，在 room energy capacity 和现有人口约束内选择可孵化 body。
- 行为必须通过一个个可观察切片进入：先写失败测试，再实现，再跑 focused gate。
- CI 必须添加默认 GitHub Actions 本地门禁：`corepack enable`、`pnpm install --frozen-lockfile`、`pnpm check`。
- 默认 CI 不得需要 Screeps token，不得部署 live/PTR，不得启动本地官方 server e2e。
- 本轮不新增 GitHub Actions 手动 live deploy workflow；CD/live deployment 仍通过本地显式命令执行，部署前本地 `pnpm check` 通过，部署后通过 API readback 校验 hash，并在 `docs/game-state.md` 记录结果或 blocked reason。
- 若生产行为部署到 live，必须记录自然 tick 或 live API 读回能证明的行为变化；API readback 只能证明代码同步，不能伪装成自然 tick。
- 文档必须同步当前生产逻辑、CI 状态、验证命令和任何 blocked facts。

## Acceptance Criteria

- [ ] Worker source 分配在单元测试中可观察：同房间多 worker、多 source 时，不再全部选择第一个 source。
- [ ] Spawn 决策在单元测试中可观察：早期 room capacity/energy 改变时，选择符合可用能量和存活目标的 worker body；无足够能量或人口已达目标时不孵化。
- [ ] Kernel 或 integration 测试证明新的 spawn/worker 决策仍通过 runtime boundary 执行，`src/main.ts` 不读取 Screeps globals。
- [ ] 本地官方 server e2e 至少跑通 smoke suite，证明 compiled loop 仍能在真实 standalone Screeps tick 中运行。
- [ ] `.github/workflows/check.yml` 存在，触发 `pull_request` 和 `push` 到主集成分支，运行 `corepack enable`、`pnpm install --frozen-lockfile`、`pnpm check`。
- [ ] 系统测试或文档检查覆盖 CI workflow 的无凭据默认门禁契约。
- [ ] `pnpm typecheck`、`pnpm lint`、focused tests、`pnpm check` 通过，或外部 blocker 被记录。
- [ ] 若执行 live deploy：`pnpm deploy:screeps` 和 `pnpm verify:live:screeps` 通过，并在 `docs/game-state.md` 记录 branch、module、hash、room、observable behavior、rollback path。
- [ ] 若 live 自然 tick 观察受阻：`docs/game-state.md` 以 `blocked` 记录具体原因，不把 API readback 当作自然 tick。

## Out of Scope

- 不实现完整 colony AI、远程采矿、自动建造布局、tower defense、market、spawn extension 规划或多房间扩张。
- 不把 live/PTR 部署放进默认 `pnpm check`。
- 不把本地官方 server e2e 放进默认 CI，除非后续任务基于稳定成本数据单独决策。
- 不提交 `dist/`、`.screeps/`、`screeps.json`、`screeps.ptr.json` 或任何 token。
- 不复制成熟 bot 架构或源码；只参考边界、阶段和运维思路。
- 不在本轮创建 GitHub Actions 手动 live deploy workflow。

## Scope Decisions

- 默认 CI：本轮添加。
- GitHub 手动 live deploy workflow：本轮不添加。
- live CD：继续使用本地显式 `pnpm deploy:screeps`、`pnpm verify:live:screeps` 和 `pnpm rollback:screeps`。
- live deploy 证据：API readback 记录代码同步；自然 tick 或 live room readback 记录行为证据；受阻时用 `blocked`。

## External References Considered

- 官方 Screeps API 文档：`spawnCreep`、`harvest`、`transfer`、`upgradeController` 的 action 与 range 行为。
- `bencbartlett/Overmind`：成熟 bot 使用 colony 级 orchestration 与集中运行结构，本任务只吸收“房间/colony 决策高于单 creep 行为”的方向。
- `TooAngel/screeps`：成熟 bot 覆盖 startup、room、creep、routing 等多个领域，本任务只吸收“startup 单独成片、逐步扩展”的方向。
- `The-International-Screeps-Bot/The-International-Open-Source`：TypeScript 自动化 bot，可作为后续生产模块边界参考，本任务不复制其结构。
- GitHub Actions workflow syntax 与 pnpm CI 文档：默认 workflow 必须放在 `.github/workflows/`，pnpm CI 使用 Corepack 与 frozen lockfile。

## Open Questions

- 无阻塞问题。
