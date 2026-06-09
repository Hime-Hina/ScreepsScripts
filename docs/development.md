# 开发

## 工具链

- Node.js：当前本地默认版本为 Node 22。
- 包管理器：`pnpm`。
- 源码语言：TypeScript。
- 构建产物：用于 Screeps 的 `dist/main.js`。

## 命令

| 命令                    | 用途                             |
| ----------------------- | -------------------------------- |
| `pnpm install`          | 安装依赖并生成 `pnpm-lock.yaml`  |
| `pnpm build`            | 构建 `dist/main.js`              |
| `pnpm typecheck`        | 对源码、测试和配置文件做类型检查 |
| `pnpm lint`             | 运行 ESLint flat config          |
| `pnpm format`           | 检查 Prettier 格式               |
| `pnpm test:unit`        | 运行单元测试                     |
| `pnpm test:integration` | 运行集成测试                     |
| `pnpm test:system`      | 构建并运行系统测试               |
| `pnpm test:e2e`         | 构建并运行本地 bundle e2e 测试   |
| `pnpm check`            | 运行完整本地验证流水线           |

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
