# Live heartbeat readback verification

## Goal

让 `pnpm status:live:screeps` 在只读 live 检查中验证自然 console heartbeat 是否已经包含 P4 runtime monitor 输出，避免继续把 P4 live runtime 证据停留在 `naturalTickHeartbeat=not-verified-by-this-script` 或只靠 API module hash 推断。

## Confirmed Facts

- `status:live:screeps` 当前只读读取 live branch、room status、room objects 和远端 module set，不部署、不回滚、不输出 token 或远端 module source。
- P4 runtime heartbeat 格式已在源码、单元/集成/bundle、本地官方 server e2e 中验证，示例字段包含 `cpu`、`bucket`、`limit`、`tickLimit`、`budget` 和 `rooms=<room>:workers=<n>:spawnEnergy=<n>/<n>:construction=<n>:hostiles=<n>`。
- Screeps auth token 官方文档支持 HTTP `X-Token`，并说明 token 可限制到 websocket events；`POST /api/user/console` 是官方记录的 console endpoint。
- 既有 PTR 记录确认 `POST /api/user/console` 请求体为 `{ shard, expression }`；本任务不需要发送 console expression。
- Console readback 需要通过 websocket 订阅自然 console 输出；手动 `require('main').loop()` 不是自然 tick 证据。

## Requirements

- 扩展现有 `status:live:screeps`，保持它是 live 只读状态命令。
- 命令必须读取 live account identity、订阅该账号 live console 事件，并等待自然 tick console 输出。
- 命令必须只接受包含 P4 runtime monitor 摘要的 heartbeat 作为通过证据：
  - `[tick <time>]`
  - `cpu=<used>`
  - `bucket=<bucket>`
  - `limit=<limit>`
  - `tickLimit=<tickLimit>`
  - `budget=<decision>`
  - configured room 的 `workers`、`spawnEnergy`、`construction`、`hostiles` 摘要
- 命令输出必须报告 `naturalTickHeartbeat=verified` 和对应 tick、shard、room、CPU/bucket/budget 摘要。
- 如果 console 输出在观察窗口内没有 P4 heartbeat，命令必须失败并给出非 secret 诊断；不能降级成 API-only 成功。
- 命令不得部署代码、上传 module、执行 rollback、提交 console expression、读取浏览器 cookie、输出 token、输出远端 module source。
- 测试必须 mock 网络/websocket 边界，覆盖成功 readback、缺字段失败、secret 不出现在输出中。
- 文档必须更新 `docs/development.md` 和 `docs/game-state.md`，说明 `status:live:screeps` 的新证据边界，以及 API readback 与自然 console heartbeat 的区别。

## Behavior Slices

### Slice 1: live API 提供账号 identity

- Public interface: `scripts/screeps/screeps-api.mjs`
- Input/action: 使用 live `screeps.json` token 调用 `GET /api/auth/me`。
- Expected outcome: 返回可用于 console websocket 订阅的账号 id；请求使用 `X-Token`，URL 不含 token。
- Mock boundary: `fetch`。

### Slice 2: live console heartbeat readback

- Public interface: `checkLiveSurvivalStatusFrom(workspacePath, ['--shard', 'shard1', '--room', 'W51N21'])`
- Input/action: 在 room/code API readback 后订阅 live console websocket。
- Expected outcome: 当 console event 中出现 P4 heartbeat 时，输出 `naturalTickHeartbeat=verified` 和 CPU/bucket/room 摘要。
- Mock boundary: `fetch`、`WebSocket`、timer。

### Slice 3: missing P4 heartbeat fails closed

- Public interface: `checkLiveSurvivalStatusFrom(...)`
- Input/action: console websocket 返回非 P4 heartbeat 或无目标 shard heartbeat。
- Expected outcome: 命令抛出 non-secret 错误；不会打印 `naturalTickHeartbeat=verified`，也不会保留 `not-verified-by-this-script`。
- Mock boundary: `fetch`、`WebSocket`、timer。

### Slice 4: docs describe the new live evidence boundary

- Public interface: `docs/development.md`、`docs/game-state.md`
- Input/action: 更新命令说明和 P4 live verification 记录。
- Expected outcome: 文档区分 API readback、room status、natural console heartbeat；不记录 secret。
- Mock boundary: none。

## Acceptance Criteria

- [x] `pnpm status:live:screeps` 成功时输出现有 room survival summary，并额外输出 `naturalTickHeartbeat=verified`。
- [x] 成功输出包含 tick、shard、room、cpu、bucket、limit、tickLimit、budget、room summary，不包含 token 或远端 module source。
- [x] 无 P4 heartbeat、缺少 CPU/bucket 字段、缺少 configured room 摘要或 shard 不匹配时，命令失败。
- [x] `verify:live:screeps`、`verify:ptr:screeps` 和 deploy/rollback 命令语义不改变。
- [x] 测试覆盖 live account identity、console websocket 成功、console websocket 失败和 project script 边界。
- [x] `pnpm test:integration -- test/integration/screeps-deployment/live-survival-status.test.ts test/integration/screeps-deployment/screeps-api.test.ts` 通过。
- [x] `pnpm test:system` 通过。
- [x] `pnpm check` 通过，或失败原因被记录为外部环境问题。
- [x] `docs/development.md` 和 `docs/game-state.md` 更新，不再把 P4 live heartbeat 证据描述为该脚本不验证。

## Out of Scope

- 不新增部署、rollback、PTR、local server 或 Chrome/browser-cookie fallback 行为。
- 不通过 console 执行 `require('main').loop()`、`Game.cpu` probe 或任何表达式。
- 不新增 package script；继续扩展 `status:live:screeps`。
- 不实现长期日志采集、dashboard、stats 存储或自动重试 live 部署。

## Open Questions

- 无阻塞问题；实现阶段如果 live websocket 官方契约与测试模拟不一致，应停止并更新设计，而不是添加 API-only fallback。
