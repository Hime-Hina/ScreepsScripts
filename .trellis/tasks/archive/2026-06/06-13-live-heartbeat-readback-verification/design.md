# Live heartbeat readback verification design

## Boundary

本任务只扩展 live 只读状态命令：

```text
pnpm status:live:screeps
  -> scripts/screeps/live-survival-status.mjs
  -> scripts/screeps/config.mjs
  -> scripts/screeps/screeps-api.mjs
  -> Screeps HTTP read API + console websocket
```

它不调用 deploy、rollback、PTR、本地 official server、Chrome 或浏览器 cookie。所有凭据仍来自 Git 忽略的 `screeps.json`，输出不得包含 token 或 module source。

## Data Flow

1. `live-survival-status.mjs` 在命令边界解析 `--shard` 和 `--room`。
2. `config.mjs` 读取并校验 `screeps.json`。
3. `screeps-api.mjs` 使用 `X-Token` 读取：
   - `GET /api/auth/me`：取得账号 id 和 username。
   - `GET /api/game/room-status`
   - `GET /api/game/room-objects`
   - `GET /api/user/code?branch=<branch>`
4. `live-survival-status.mjs` 打开 live console websocket，认证 token，订阅 `user:<accountId>/console`。
5. Console event 中只接受目标 shard 的 natural tick heartbeat。
6. Heartbeat parser 校验 P4 字段并输出摘要。

## Contracts

### Account Identity

`screeps-api.mjs` 拥有 HTTP response 解码。新增 live account identity 读取时在 API 边界一次性校验账号 id：

- 接受 Screeps live `auth/me` payload 中的 `_id` 作为账号 id。
- `username` 只作为诊断输出字段，不参与订阅 channel。
- 缺少账号 id 时抛出 `ScreepsApiError`。

内部调用方拿到已验证的 account identity 后不再重复做空值兜底。

### Console Websocket

Console websocket readback 属于 `status:live:screeps` 的只读观察，不进入通用部署 API：

- URL 由 `screeps.json` 的 `protocol/server` 派生，`https` 使用 `wss`，`http` 使用 `ws`。
- 使用 SockJS raw websocket endpoint `/socket/<server>/<session>/websocket`。
- 连接后发送 `["auth <token>"]`。
- 收到 `auth ok` 后发送 `["subscribe user:<accountId>/console"]`。
- 只读取服务器推送的 console event，不发送 `POST /api/user/console`。

Websocket 解码只支持本命令需要的 frame：

- `o`：open。
- `h`：heartbeat，忽略。
- `a[...]`：SockJS message array。
- `m"..."`：单 message。
- `c[...]`：close，转为失败。

未知 frame 不作为成功证据。

### Heartbeat Parser

Parser 只验证 P4 runtime monitor heartbeat：

```text
[tick <time>] cpu=<used> bucket=<bucket> limit=<limit> tickLimit=<tickLimit> budget=<decision> rooms=<room>:workers=<n>:spawnEnergy=<n>/<n>:construction=<n>:hostiles=<n>
```

字段缺失、目标 room 缺失、目标 shard 不匹配都失败。成功摘要保留原始 line 之外的结构化字段，命令输出使用结构化字段，避免下游重新解析 console 字符串。

## Error Behavior

- HTTP endpoint 失败沿用 `ScreepsApiError` 非 secret 诊断。
- Websocket auth failed、close、timeout、缺少 P4 heartbeat 都抛出 `LiveSurvivalStatusError`。
- 不做 API-only fallback；API-only 成功不能替代 natural tick heartbeat。
- 不输出 token、完整 websocket URL 中的 token、远端 module source、`auth ok` 返回的新 token。

## Tests

- `test/integration/screeps-deployment/screeps-api.test.ts`
  - live `auth/me` 使用 `X-Token`。
  - 缺少 account id 失败。
- `test/integration/screeps-deployment/live-survival-status.test.ts`
  - 成功输出 room summary 和 `naturalTickHeartbeat=verified`。
  - console heartbeat 缺 `bucket` 或缺目标 room 摘要时失败。
  - auth failed / close 不泄露 token。
- `test/system/project-scripts.test.ts`
  - `status:live:screeps` 仍是独立 live smoke，不进入 `pnpm check`。

## Documentation

- `docs/development.md`：更新命令说明，明确 status 会订阅 live console websocket 验证 P4 heartbeat。
- `docs/game-state.md`：记录新 readback 行为或 blocked 原因；若实际 live 调用通过，应追加 observed 记录。

## Rollback

普通 git rollback 即可。该任务不改变 live branch、远端 module set 或本地 rollback snapshot。
