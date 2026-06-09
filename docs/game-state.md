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

## 起始房间候选筛选

2026-06-10 通过只读 API 脚本记录：

```powershell
pnpm scout:screeps -- --shard shard3 --room W13S27 --room W12S28 --room W12S29 --room W17S29 --room W18S26
```

- 筛选命令：`pnpm scout:screeps`（`observed`，API readback + 本地脚本）
- 筛选范围：`shard3` 的 `W13S27`、`W12S28`、`W12S29`、`W17S29`、`W18S26`（`observed`，API）
- 当时排序：
  1. `W17S29`：score `86.5`，推荐 spawn `15,27`，source distances `21/17`，controller `5`，swamp `7.2%`，wall `25.7%`，risk `32.0`，mineral `K`（`observed`，API + derived scoring）
  2. `W12S29`：score `88.2`，推荐 spawn `25,21`，source distances `17/17`，controller `22`，swamp `1.6%`，wall `27.6%`，risk `36.0`，mineral `O`（`observed`，API + derived scoring）
  3. `W13S27`：score `96.4`，推荐 spawn `14,24`，source distances `5/5`，controller `25`，swamp `3.5%`，wall `32.4%`，risk `72.0`，mineral `K`（`observed`，API + derived scoring）
  4. `W12S28`：score `119.5`，推荐 spawn `24,19`，source distances `16/15`，controller `11`，swamp `5.6%`，wall `32.0%`，risk `73.0`，mineral `Z`（`observed`，API + derived scoring）
  5. `W18S26`：score `147.3`，推荐 spawn `19,20`，source distances `37/42`，controller `50`，swamp `41.5%`，wall `28.4%`，risk `0.0`，mineral `U`（`observed`，API + derived scoring）
- `W18S26`：因 room swamp `41.5%`、推荐 spawn 周边 local swamps `6`、source/controller 路径距离过长，当前淘汰（`derived`，筛选脚本评分）。
- 2026-06-10 修正 full-area 扫描中“相邻候选房间未计入 neighbor risk”的脚本缺陷后，重新扫描 `shard3 / W10S20:W19S29`（`observed`，API + derived scoring）：
  - `W15S27`：score `58.2`，推荐 spawn `44,30`，source distances `17/17`，controller `16`，swamp `4.1%`，wall `40.7%`，risk `7.0`，mineral `O`（`observed`，API + derived scoring）。
  - `W18S25`：score `79.4`，推荐 spawn `16,14`，source distances `22/8`，controller `21`，swamp `24.9%`，wall `23.0%`，risk `14.0`，mineral `U`（`observed`，API + derived scoring）。
  - `W17S29`：score `85.5`，推荐 spawn `15,27`，source distances `21/17`，controller `5`，swamp `7.2%`，wall `25.7%`，risk `31.0`，mineral `K`（`observed`，API + derived scoring）。
  - `W12S29`：score `89.2`，推荐 spawn `25,21`，source distances `17/17`，controller `22`，swamp `1.6%`，wall `27.6%`，risk `37.0`，mineral `O`（`observed`，API + derived scoring）。
- 2026-06-10 重新扫描 `shard2 / W50S40:W59S49`（`observed`，API + derived scoring）：
  - `W54S41`：score `105.5`，推荐 spawn `12,35`，source distances `7/19`，controller `59`，swamp `13.4%`，wall `58.8%`，risk `33.0`，mineral `K`（`observed`，API + derived scoring）。
  - `W58S45`：score `112.1`，推荐 spawn `39,40`，source distances `37/7`，controller `24`，swamp `0.0%`，wall `35.8%`，risk `40.0`，mineral `O`（`observed`，API + derived scoring）。
  - `W54S43`：score `120.4`，推荐 spawn `24,34`，source distances `15/22`，controller `9`，swamp `17.8%`，wall `34.6%`，risk `59.0`，mineral `U`（`observed`，API + derived scoring）。
- 2026-06-10 复核低沼泽候选（`pnpm scout:screeps -- --shard shard3 --room W12S6 --room W15S27`）：
  - `W12S6`：score `57.7`，推荐 spawn `23,23`，source distances `10/11`，controller `11`，swamp `1.4%`，wall `27.8%`，risk `26.0`，mineral `H`（`observed`，API + derived scoring）。
  - `W15S27`：score `58.2`，推荐 spawn `44,30`，source distances `17/17`，controller `16`，swamp `4.1%`，wall `40.7%`，risk `7.0`，mineral `O`（`observed`，API + derived scoring）。
- 2026-06-10 增强启发式后重新复核 `shard3` 低沼泽候选（`pnpm scout:screeps -- --shard shard3 --room W12S6 --room W15S27 --room W18S25 --room W18S26`）：
  - `W15S27`：rank `1`，suitability `good`，score `52.6`，推荐 spawn `44,30`，source distances `17/17`，controller `16`，swamp `4.1%`，wall `40.7%`，pathPenalty `0.0`，terrainPenalty `0.7`，risk `3.0`，mineral `O`；限制是 wall `40.7%` 高于起始房间 target，且有 `1` 个 reserved neighboring room（`observed`，API + derived scoring）。
  - `W12S6`：rank `2`，suitability `excellent`，score `55.9`，推荐 spawn `23,23`，source distances `10/11`，controller `11`，swamp `1.4%`，wall `27.8%`，pathPenalty `0.0`，terrainPenalty `0.0`，risk `25.0`，mineral `H`；限制是邻居中有 `5` creeps、`1` owned room、`3` towers、`2` spawns（`observed`，API + derived scoring）。
  - `W18S25`：rank `3`，suitability `poor`，score `146.2`，swamp `24.9%`，terrainPenalty `65.9`，因高沼泽、source 距离失衡和局部 spawn 周边沼泽较多淘汰（`observed`，API + derived scoring）。
  - `W18S26`：rank `4`，suitability `poor`，score `395.6`，swamp `41.5%`，terrainPenalty `198.7`，因高沼泽、source/controller 距离过长淘汰（`observed`，API + derived scoring）。
- 2026-06-10 增强启发式后重新复核 `shard2` 候选（`pnpm scout:screeps -- --shard shard2 --room W54S41 --room W54S43 --room W58S45`）：
  - `W54S43`：suitability `poor`，score `133.6`，swamp `17.8%`，risk `58.0`，因沼泽超过起始房间 ceiling 且邻居拥有房间/creeps/spawns 较多淘汰（`observed`，API + derived scoring）。
  - `W54S41`：suitability `poor`，score `209.0`，swamp `13.4%`，wall `58.8%`，controller distance `59`，因高墙、高 controller 距离和局部沼泽淘汰（`observed`，API + derived scoring）。
  - `W58S45`：`rejected`，controller is reserved，当前不作为起始区域候选（`observed`，API）。
- `shard1 / W100S40:W109S49` 已扫描；全部候选返回 `api-error` 并拒绝，当前不作为起始区域候选（`observed`，API）。
- 当前增强启发式排序第一候选：`shard3 / W15S27`，推荐 spawn `44,30`，原因是两源、low swamp `4.1%`、source distances `17/17`、controller distance `16`、open5x5 `25`、neighbor risk `3.0`；限制是 wall `40.7%` 超过 target（`derived`，筛选脚本评分）。
- 当前增强启发式排序第二候选：`shard3 / W12S6`，推荐 spawn `23,23`，原因是两源、room swamp `1.4%`、source distances `10/11`、controller distance `11`、open5x5 `25`、terrainPenalty `0.0`；限制是 neighbor risk `25.0` 高于 `W15S27`（`derived`，筛选脚本评分）。
- 最终起始房间：尚未确认（`blocked`）。
- Spawn 放置状态：尚未放置（`blocked`）。
- 当前阻塞原因：spawn 放置是不可逆 live 操作，正在等待用户明确确认最终选择 `shard3 / W15S27` 的 `44,30`，或因低沼泽/近源优先选择 `shard3 / W12S6` 的 `23,23`；尚未放置名为 `Spawn1` 的第一个 spawn（`blocked`）。

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
