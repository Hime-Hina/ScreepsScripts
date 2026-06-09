# 开发

## 工具链

- Node.js：当前本地默认版本为 Node 22。
- 包管理器：`pnpm`。
- 源码语言：TypeScript。
- 构建产物：用于 Screeps 的 `dist/main.js`。

## 命令

| 命令                       | 用途                                                   |
| -------------------------- | ------------------------------------------------------ |
| `pnpm install`             | 安装依赖并生成 `pnpm-lock.yaml`                        |
| `pnpm build`               | 构建 `dist/main.js`                                    |
| `pnpm typecheck`           | 对源码、测试和配置文件做类型检查                       |
| `pnpm lint`                | 运行 ESLint flat config                                |
| `pnpm format`              | 检查 Prettier 格式                                     |
| `pnpm deploy:screeps`      | 本地完整验证、重新构建并部署到 Screeps live branch     |
| `pnpm verify:live:screeps` | 构建并通过 Screeps API readback 校验 live branch       |
| `pnpm rollback:screeps`    | 用本地 rollback snapshot 恢复上一份 Screeps 远端模块集 |
| `pnpm scout:screeps`       | 只读读取 Screeps API 并按启发式排序起始房间候选        |
| `pnpm test:unit`           | 运行单元测试                                           |
| `pnpm test:integration`    | 运行集成测试                                           |
| `pnpm test:system`         | 构建并运行系统测试                                     |
| `pnpm test:e2e`            | 构建并运行本地 bundle e2e 测试                         |
| `pnpm check`               | 运行完整本地验证流水线                                 |

## CI 和 Hooks

CI 和本地 hooks 尚未配置。当前完成门槛是本地 `pnpm check`。

未来添加 CI 时，应运行 `corepack enable`、`pnpm install --frozen-lockfile` 和 `pnpm check`，默认不使用 live Screeps 凭据。

## TDD 规则

不要先写大块策略代码。先添加一个行为测试，让它通过，再进入下一个行为。测试应验证公开行为，而不是私有实现细节。

## Screeps 凭据

不要提交 live Screeps 凭据。本地部署配置保存在 `screeps.json`，该文件被 Git 忽略。`screeps.example.json` 只用于记录配置结构。

外部 API 访问需要在 Screeps 账号设置中生成 auth token：

```text
https://screeps.com/a/#!/account/auth-tokens
```

使用 token，不使用账号密码。直接 HTTP 调用优先使用 `X-Token` 请求头，避免 token 出现在 URL、shell 历史或日志中。Screeps 也支持 `_token` query parameter，但项目工具应避免使用，除非有已记录的外部约束要求。

## Screeps 部署与回滚

`deploy:screeps` 会在 live 上传前运行 `pnpm check`，随后立即重新构建 `dist/main.js`。脚本先读取当前远端 module set，写入 Git 忽略的 `.screeps/rollback/latest.json`，再上传本地 `main` module，并通过 API readback 校验 hash。

`verify:live:screeps` 只校验 Screeps API readback 中的 `main` module 与本地 `dist/main.js` 一致，并报告远端 module 列表。它不证明自然生产 tick 已执行。

`rollback:screeps` 从 `.screeps/rollback/latest.json` 恢复同一 branch 的上一份远端 module set，并再次 readback 校验。没有 snapshot 或 snapshot branch 与 `screeps.json` 不一致时，脚本会停止。

## Screeps 房间筛选

`scout:screeps` 是只读候选房间筛选工具。它读取 `screeps.json` 中的 API token，通过 `X-Token` 调用 room objects、room status 和 room terrain endpoint，不部署代码、不保存 IDE、不放置 spawn。

示例：

```powershell
pnpm scout:screeps -- --shard shard3 --area W10S20:W19S29
pnpm scout:screeps -- --shard shard3 --room W13S27 --room W12S28
```

输出包含候选排序、room status、source 数量、推荐 spawn 坐标、到 sources/controller 的路径距离、沼泽/墙比例、矿物、候选房间和邻居风险明细、拒绝原因。最终房间与 spawn 名称仍必须写入 `docs/game-state.md`，放置 spawn 后再记录自然 tick heartbeat。
