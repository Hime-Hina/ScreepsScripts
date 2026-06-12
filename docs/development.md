# 开发

## 工具链

- Node.js：当前本地默认版本为 Node 22。
- 包管理器：`pnpm`。
- 源码语言：TypeScript。
- 构建产物：用于 Screeps 的 `dist/main.js`。

## 命令

| 命令                          | 用途                                                   |
| ----------------------------- | ------------------------------------------------------ |
| `pnpm install`                | 安装依赖并生成 `pnpm-lock.yaml`                        |
| `pnpm build`                  | 构建 `dist/main.js`                                    |
| `pnpm typecheck`              | 对源码、测试和配置文件做类型检查                       |
| `pnpm lint`                   | 运行 ESLint flat config                                |
| `pnpm format`                 | 检查 Prettier 格式                                     |
| `pnpm deploy:screeps`         | 本地完整验证、重新构建并部署到 Screeps live branch     |
| `pnpm deploy:ptr:screeps`     | 本地完整验证、重新构建并部署到 Screeps PTR branch      |
| `pnpm found:ptr-room:screeps` | 通过 PTR API 尝试创建已记录的 PTR 主房间               |
| `pnpm verify:live:screeps`    | 构建并通过 Screeps API readback 校验 live branch       |
| `pnpm verify:ptr:screeps`     | 构建并通过 Screeps PTR API readback 校验 PTR branch    |
| `pnpm rollback:screeps`       | 用本地 rollback snapshot 恢复上一份 Screeps 远端模块集 |
| `pnpm rollback:ptr:screeps`   | 用本地 PTR snapshot 恢复上一份 PTR 远端模块集          |
| `pnpm scout:screeps`          | 只读读取 Screeps API 并按启发式排序起始房间候选        |
| `pnpm test:unit`              | 运行单元测试                                           |
| `pnpm test:integration`       | 运行集成测试                                           |
| `pnpm test:system`            | 构建并运行系统测试                                     |
| `pnpm test:bundle`            | 构建并运行编译后 bundle smoke                          |
| `pnpm test:screeps-server`    | 启动本地官方 standalone server 并运行 smoke e2e suite  |
| `pnpm check`                  | 运行完整本地验证流水线                                 |

## CI 和 Hooks

默认 GitHub Actions CI 已配置在 `.github/workflows/check.yml`。它在 `pull_request` 和 push 到 `master` 时运行，使用 Node 22，依次执行 `corepack enable`、`pnpm install --frozen-lockfile` 和 `pnpm check`。

默认 CI 和 `pnpm check` 不读取 Screeps token，不连接官方 PTR 或 live 主服，不运行 deploy、verify、rollback、scout、found PTR room，也不启动本地官方 Screeps server。`pnpm check` 包含 `test:bundle`，用于证明 `dist/main.js` 能被加载并执行，但这不是真实 Screeps engine 验证。

本地 hooks 尚未配置。当前本地完成门槛仍是 `pnpm check`。

## 本地官方 Server PoC

`pnpm test:screeps-server` 是显式运行的服务端端到端测试。它会先执行 `pnpm build`，再在 `.screeps/server/package/` 安装或复用官方 `screeps@4.3.0`，为每次运行创建 `.screeps/server/runs/<id>/`，加载 `single-owned-spawn` fixture，并运行 smoke suite。

`.screeps/server/` 是生成状态并被 Git 忽略。首次运行需要通过 `node-gyp` 编译官方 server native 依赖，耗时明显高于 warm cache；该命令不属于默认 `pnpm check`。

当前 smoke suite 由 runner registry 编排，包含 `basic-runtime-heartbeat` 和 `memory-schema-write` 两个 case，用于观察 `AliceBot / W1N9 / Spawn1` 的自然 tick heartbeat 和 `Memory.screepsScripts.schemaVersion = 1`。P3 defense fallback 的本地 engine 演练通过显式 case 运行：`node scripts/screeps-server/run-suite.mjs case defense-core-threat-safe-mode`，它使用独立 `defense-core-threat` fixture，并验证 near-core hostile creep 触发 controller safe mode。以后本地 server e2e 扩展时，`package.json` 只保留少量稳定套件入口，例如 smoke/full；具体行为 case 和 fixture 继续由 runner 内部 registry 管理。case selection 只允许用于同一个本地官方 server e2e 边界内的调试，不能通过 flag/mode 切换到 PTR、live、deploy、rollback 或任何读取凭据、修改官方服务的操作。

`scripts/screeps-server/run-suite.mjs` 是稳定入口。`cases/` 保存 suite/case registry 和 case assertions，`fixtures/` 保存 `single-owned-spawn` world seeding，`framework/` 保存官方 package 缓存、harness 生命周期、进程控制、命令执行、端口保留、server output 和 status waiting，`observability/` 保存 run-scoped status mod 生成。

## RCL2 Construction Development

RCL2 extension planner 的纯行为测试位于 `test/unit/construction/`，公开入口是 `src/construction/construction-planner.ts` 的 `planRoomConstruction`。该层只接收 snapshot，不读取 Screeps globals。

Worker RCL2 能量流测试位于 `test/unit/creeps/worker-decision.test.ts`，覆盖 harvest、refill spawn/extension、P0 controller downgrade guard、critical spawn/extension/container/road repair、build construction site 和 upgrade controller 的优先级。

Runtime 集成测试位于 `test/integration/main-loop.test.ts`，负责证明 `Room.createConstructionSite`、`Creep.transfer`、`Creep.repair` 和 `Creep.build` 只通过 runtime boundary 执行。编译后 smoke 由 `test/e2e/compiled-loop.test.ts` 覆盖运行时读取的 Screeps 常量。

当前 RCL2 范围包含 extension/refill/build、P0 controller downgrade guard、P1 construction backpressure，以及已有 spawn/extension/container/road 的 P2 critical repair fallback。Road/container planner、wall/rampart fortification、tower、distance transform、floodfill、min-cut 和完整 base layout 必须作为后续独立切片进入。

## TDD 规则

不要先写大块策略代码。先添加一个行为测试，让它通过，再进入下一个行为。测试应验证公开行为，而不是私有实现细节。

## Screeps 凭据

不要提交 live Screeps 凭据。本地部署配置保存在 `screeps.json`，该文件被 Git 忽略。`screeps.example.json` 只用于记录配置结构。

PTR 凭据独立保存在 `screeps.ptr.json`，该文件被 Git 忽略。`screeps.ptr.example.json` 只记录 PTR 配置结构，字段为 `branch` 和 `token`。PTR 配置不包含 `protocol`、`server` 或 API base；PTR API base 固定为 `https://screeps.com/ptr/api/`。

外部 API 访问需要在 Screeps 账号设置中生成 auth token：

```text
https://screeps.com/a/#!/account/auth-tokens
```

使用 token，不使用账号密码。直接 HTTP 调用优先使用 `X-Token` 请求头，避免 token 出现在 URL、shell 历史或日志中。Screeps 也支持 `_token` query parameter，但项目工具应避免使用，除非有已记录的外部约束要求。

## Screeps 部署与回滚

`deploy:screeps` 会在 live 上传前运行 `pnpm check`，随后立即重新构建 `dist/main.js`。脚本先读取当前远端 module set，写入 Git 忽略的 `.screeps/rollback/latest.json`，再上传本地 `main` module，并通过 API readback 校验 hash。

`verify:live:screeps` 只校验 Screeps API readback 中的 `main` module 与本地 `dist/main.js` 一致，并报告远端 module 列表。它不证明自然生产 tick 已执行。

`rollback:screeps` 从 `.screeps/rollback/latest.json` 恢复同一 branch 的上一份远端 module set，并再次 readback 校验。没有 snapshot 或 snapshot branch 与 `screeps.json` 不一致时，脚本会停止。

## Screeps PTR Smoke

官方 PTR 是独立在线环境，世界数据、脚本、Memory 和设置与 live 主服分离。PTR 每周一 `00:00 UTC` 从主服复制数据并擦除旧 PTR 数据，包括玩家脚本；PTR CPU subscription 默认停用，需要在 PTR order page 激活到下一次 reset。PTR 中建筑建造和 controller 升级成本与 live 不同，PTR 证据不能替代 live 生产验证。

`deploy:ptr:screeps` 会先运行本地完整验证，再重新构建 `dist/main.js`。脚本读取 `screeps.ptr.json`，使用 `X-Token` 请求头访问固定 endpoint `https://screeps.com/ptr/api/user/code`，先把当前 PTR 远端 module set 保存到 `.screeps/ptr/latest.json`，再上传本地 `main` module，并通过 PTR API readback 校验。

`verify:ptr:screeps` 只校验 PTR API readback 中的 `main` module 与本地 `dist/main.js` 一致，并报告远端 module 列表。它不证明 PTR 自然 tick 已执行，输出会把 `naturalTickHeartbeat` 标为 `not-verified-by-this-script`。

`found:ptr-room:screeps` 只使用 `screeps.ptr.json` 和固定 PTR API base，读取 PTR account、overview、shard、room status，并在账号没有 owned room 时向 `https://screeps.com/ptr/api/game/place-spawn` 提交已记录的主房间目标：`shard1 / W51N21`、`Spawn1` at `35,23`。该命令不部署代码、不读取 live 配置、不进入本地 official server fallback；成功、失败或 blocked 结果都应记录到 `docs/game-state.md`。

`rollback:ptr:screeps` 从 `.screeps/ptr/latest.json` 恢复同一 PTR branch 的上一份远端 module set，并再次 readback 校验。没有 snapshot 或 snapshot branch 与 `screeps.ptr.json` 不一致时，脚本会停止。

PTR reset、缺少 PTR token、未激活 PTR CPU subscription 或未观察到自然 tick 时，应在 `docs/game-state.md` 记录为 `blocked`，不能把 API readback 当成自然 tick 验证。

## Screeps 房间筛选

`scout:screeps` 是只读候选房间筛选工具。它读取 `screeps.json` 中的 API token，通过 `X-Token` 调用 room objects、room status 和 room terrain endpoint，不部署代码、不保存 IDE、不放置 spawn。

示例：

```powershell
pnpm scout:screeps -- --shard shard3 --area W10S20:W19S29
pnpm scout:screeps -- --shard shard3 --room W13S27 --room W12S28
```

输出包含候选排序、room status、起始适合度、source 数量、推荐 spawn 坐标、到 sources/controller 的路径距离、局部开阔度、沼泽/墙比例、路径/地形/risk 评分拆解、矿物、候选房间和邻居风险明细、警告原因、拒绝原因。最终房间与 spawn 名称仍必须写入 `docs/game-state.md`，放置 spawn 后再记录自然 tick heartbeat。
