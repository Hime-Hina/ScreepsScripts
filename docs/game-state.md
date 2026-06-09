# 游戏状态

## 当前状态

2026-06-09 通过 Chrome 记录。

- 账号：`Dragon_King`（`observed`，UI）
- 世界：Persistent World（`observed`，UI）
- 可见 shard：`shard3`（`observed`，UI）
- 账号概览：
  - GCL：`6`（`observed`，UI）
  - CPU limit：`20`（`observed`，UI）
  - CPU bucket：blocked，尚未观察到。
  - CPU tick limit：blocked，尚未观察到。
  - GPL：`0`（`observed`，UI）
  - Credits：`0.000`（`observed`，UI）
  - Inventory counters：`0 / 0 / 0`（`observed`，UI）
- 当前房间状态：尚未确认 owned room（`blocked`）。
- 已打开房间页面：`shard3 / room W16S2`（`observed`，UI）
  - Owner：`None`（`observed`，UI）
  - UI 状态：`Place your spawn`（`observed`，UI）
  - UI 显示的 sign owner：`wtfrank`（`observed`，UI）
  - 最后可见 sign 时间：`2026/3/23`，`tick # 78804899`（`observed`，UI）
- Spawn 名称：尚未创建（`blocked`）。
- Controller 等级：放置 spawn 前不可用（`blocked`）。
- Sources：当前 UI 状态不可见（`blocked`）。
- Exits：当前 UI 状态不可见（`blocked`）。
- Mineral：当前 UI 状态不可见（`blocked`）。
- Hostile 状态：当前 UI 状态不可见（`blocked`）。

## 代码部署

- 浏览器路径：Chrome，已登录（`observed`，UI）。
- Screeps IDE branch：`main`（`observed`，UI）。
- 本地 `screeps.json` branch：`main`（`observed`，本地配置；未记录 secret 值）。
- 替换前远端已有模块：`main`、`main.js.map`（`observed`，API readback）。
- 远端残留模块决策：`deploy:screeps` 只发布本地 `dist/main.js` 对应的 `main` module；部署前会把既有远端 module set 保存到 rollback snapshot，因此 `main.js.map` 不作为当前部署目标保留（`derived`，本地脚本契约）。
- 已部署模块：`main`（`observed`，API readback）。
- 已部署本地产物：`dist/main.js`（`derived`，本地构建）。
- API readback：
  - `GET /api/user/code?branch=main`
  - Result：`ok = 1`（`observed`，API readback）
  - Modules：`main` length `534`，`main.js.map` length `80881`（`observed`，API readback）
- 远端 `main` 内容与本地 `dist/main.js` 一致（`derived`，API readback + 本地 hash）。
- SHA-256：`5271f78c0eebfd0c5ec1b8acc2c7c1768770d9b395bde7e9a48399434cd7b308`（`derived`）。
- Rollback path：`pnpm rollback:screeps` 从 `.screeps/rollback/latest.json` 恢复同一 branch 的上一份远端 module set，并用 API readback 校验（`derived`，本地脚本契约；尚未执行 live rollback）。
- Previous remote hash：尚未记录（`blocked`）。
- Live runtime verification：blocked；API readback 只能确认代码同步，不等于自然 tick 运行验证。
- 已保存行为：

```text
[tick <time>] cpu=<used>
```

- 保存验证：IDE save 按钮保存后回到 disabled 状态。
- 曾尝试 console 验证：

```javascript
require('main').loop();
```

命令出现在 Console 中，但未看到 heartbeat 输出。当前阻塞点是尚未放置 spawn，因此还不能观察自然生产 tick 执行。

## API 访问

- Chrome 自动化无法直接复用浏览器 cookie 访问 `/api/*`。
- 使用本地 `screeps.json` 中的 token 可以访问外部 API。
- Auth token 在账号设置中生成：

```text
https://screeps.com/a/#!/account/auth-tokens
```

- Screeps 文档记录的 token 使用方式：
  - `X-Token` request header。
  - `_token` query parameter。
- 未输出或提交任何 auth token。

## 阻塞事实

以下事实需要先放置第一个 spawn，或使用可工作的认证 API 路径确认：

- 初始 spawn 位置。
- Spawn 名称。
- Owned room controller 状态。
- 实际 source 数量和位置。
- Mineral 类型和位置。
- Exit 拓扑。
- 生产 Console 中自然每 tick heartbeat。

## 下一步生产动作

在房间中点击放置第一个 spawn 前，需要先选择并确认：

- 最终起始房间。
- Spawn 位置。
- Spawn 名称。
- `main` branch 是否继续作为 active production branch。

在这些事实明确前，不要硬编码房间假设。
