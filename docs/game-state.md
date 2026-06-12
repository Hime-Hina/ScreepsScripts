# 游戏状态

## 当前状态

2026-06-12 通过 Screeps API 更新。

- 账号：`Dragon_King`（`observed`，API / 既有 UI 记录）
- 世界：Persistent World（`observed`，既有 UI 记录）
- Account CPU shard 配置：`shard1 = 20`（`observed`，`/api/auth/me`）
- `shards/info` 运行态 `cpuLimit` 仍显示旧值 `shard3 = 20`、`shard1 = 0`；实际执行以账号 `cpuShard` 配置和新房间 live 行为为准（`observed`，API）。
- Active production room：`shard1 / W51N21`（`observed`，API）。
- Spawn：`Spawn1`，位置 `35,23`，energy `3`，当前正在孵化 `Spawn1-worker-71610403`，body `[WORK, CARRY, CARRY, MOVE, MOVE]`（`observed`，API）。
- Controller：位置 `26,7`，RCL `2`，progress `8572`，safe mode until tick `71622765`，safe mode available `1`（`observed`，API）。
- Sources：
  - 位置 `28,5`，energy `2900/3000`（`observed`，API）。
  - 位置 `19,43`，energy `2960/3000`（`observed`，API）。
- Creeps：
  - `Spawn1-worker-71608998`，body `[WORK, CARRY, MOVE]`，最后读回位置 `22,42`，carry energy `40`（`observed`，API）。
  - `Spawn1-worker-71610306`，body `[WORK, CARRY, MOVE]`，最后读回位置 `35,24`，carry energy `46`（`observed`，API）。
  - `Spawn1-worker-71610403`，body `[WORK, CARRY, CARRY, MOVE, MOVE]`，仍在 spawning（`observed`，API）。
- 自持循环证据：controller 已升级到 RCL `2`，两个存活 worker 正在采集或运输，旧 worker 死亡后新代码已用 300-energy body 触发补员（`observed`，API + derived source behavior）。
- Former production room `shard3 / W15S27` 当前无 spawn、无 creeps、controller owner `null`，`place-spawn` 返回 `room not available`（`observed`，API）。

## 历史状态：2026-06-10 shard3 / W15S27

2026-06-09 通过 Chrome 记录；2026-06-10 通过 Screeps API 和 console websocket 更新。

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
- 当前房间状态：已有 owned room `shard3 / W15S27`（`observed`，API）。
- 历史打开房间页面：`shard3 / room W16S2`（`observed`，UI）
  - Owner：`None`（`observed`，UI）
  - UI 状态：`Place your spawn`（`observed`，UI）
  - UI 显示的 sign owner：`wtfrank`（`observed`，UI）
  - 最后可见 sign 时间：`2026/3/23`，`tick # 78804899`（`observed`，UI）
- Active production room：`shard3 / W15S27`（`observed`，API）。
- Spawn：`Spawn1`，id `6a28e0c0c1ca830013f65bd9`，位置 `44,30`，energy `300`，hits `5000/5000`（`observed`，API）。
- Controller：id `5bbcac109099fc012e634d37`，位置 `37,21`，RCL `1`，progress `0/0`，safe mode until tick `80778215`，safe mode available `0`（`observed`，API）。
- Sources：
  - id `5bbcac109099fc012e634d35`，位置 `42,12`，energy `1500/3000`（`observed`，API）。
  - id `5bbcac109099fc012e634d36`，位置 `37,18`，energy `1500/3000`（`observed`，API）。
- Exits：
  - North exit to `W15S26`：open edge tiles `11`（`observed`，API terrain）。
  - East exit to `W16S27`：open edge tiles `29`（`observed`，API terrain）。
  - South exit to `W15S28`：open edge tiles `0`（`observed`，API terrain）。
  - West exit to `W14S27`：open edge tiles `3`（`observed`，API terrain）。
- Mineral：id `5bbcb25240062e4259e938e2`，type `O`，位置 `28,40`，density `2`（`observed`，API）。
- Hostile 状态：room objects 中 hostile creeps `0`、hostile spawns `0`、hostile towers `0`（`observed`，API）。

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
- 最终起始房间：`shard3 / W15S27`（`observed`，API）。
- 最终 spawn 位置：`44,30`（`observed`，API）。
- 最终 spawn 名称：`Spawn1`（`observed`，API）。
- 当前增强启发式排序第一候选：`shard3 / W15S27`，原因是两源、low swamp `4.1%`、source distances `17/17`、controller distance `16`、open5x5 `25`、neighbor risk `3.0`；限制是 wall `40.7%` 超过 target（`derived`，筛选脚本评分）。已选择并放置 spawn（`observed`，API）。
- 当前增强启发式排序第二候选：`shard3 / W12S6`，推荐 spawn `23,23`，原因是两源、room swamp `1.4%`、source distances `10/11`、controller distance `11`、open5x5 `25`、terrainPenalty `0.0`；限制是 neighbor risk `25.0` 高于 `W15S27`（`derived`，筛选脚本评分）。
- Spawn 放置状态：已放置；`POST /api/game/place-spawn` 返回 `ok=1`、`newbie=true`，随后 API readback 看到 `Spawn1`（`observed`，API）。

## 代码部署

- 浏览器路径：Chrome，已登录（`observed`，UI）。
- Screeps IDE branch：`main`（`observed`，UI）。
- 本地 `screeps.json` branch：`main`（`observed`，本地配置；未记录 secret 值）。
- 最新部署前远端已有模块：`main`、`main.js.map`（`observed`，API readback）。
- 远端残留模块决策：`deploy:screeps` 只发布本地 `dist/main.js` 对应的 `main` module；部署前会把既有远端 module set 保存到 rollback snapshot，因此 `main.js.map` 不作为当前部署目标保留（`derived`，本地脚本契约）。
- 已部署模块：`main`（`observed`，API readback）。
- 已部署本地产物：`dist/main.js`（`derived`，本地构建）。
- API readback：
  - `GET /api/user/code?branch=main`
  - Result：`ok = 1`（`observed`，API readback）
  - Modules：`main`（`observed`，API readback）。
- 远端 `main` 内容与当前本地 `dist/main.js` 一致（`derived`，API readback + 本地 hash）。
- Module set SHA-256：`a1fa2e8221dbadc9741bb2e76e7bdfaa6054a1c73db4e23bc407c51f17dc158f`（`derived`）。
- 本地 `dist/main.js` 文件 SHA-256：`23aeb145934ddd17f94618f211704ea0580c095f754b0a9d4bdf347beaf806a4`（`derived`）。
- Rollback path：`pnpm rollback:screeps` 从 `.screeps/rollback/latest.json` 恢复同一 branch 的上一份远端 module set，并用 API readback 校验（`derived`，本地脚本契约；尚未执行 live rollback）。
- Previous remote hash：`87534439e365323bb9d223627cb1b21593b75384d36604cdbdd469737a152df8`（`derived`，deploy snapshot hash）。
- Live runtime verification：自然 tick heartbeat 已通过 console websocket 观察到（`observed`，websocket）。
- 已保存行为：

```text
[tick <time>] cpu=<used>
```

- 保存验证：IDE save 按钮保存后回到 disabled 状态。
- 曾尝试 console 验证：

```javascript
require('main').loop();
```

该手动命令不作为 live runtime verification 证据；自然 tick 证据以下方 websocket 观察为准。

- 2026-06-10 放置 spawn 后，console websocket 观察到旧部署自然 tick heartbeat：`[tick 80758278] cpu=0.04`（`observed`，websocket）。
- 2026-06-10 部署当前本地代码后，`pnpm verify:live:screeps` 返回 `apiReadback=main-matched`，branch `main`，localModules `main`，remoteModules `main`，hash `9611f3c2a384ca80813c8d79979624bbf8f424efad9e4ecac849c32ac62b6d62`（`observed`，API readback + derived hash）。
- 2026-06-10 部署当前本地代码后，console websocket 观察到自然 tick heartbeat：`[tick 80758326] cpu=0.20`，shard `shard3`，error `null`（`observed`，websocket）。
- 2026-06-12 部署自持 bootstrap 代码后，`pnpm verify:live:screeps` 返回 `apiReadback=main-matched`，branch `main`，localModules `main`，remoteModules `main`，hash `87534439e365323bb9d223627cb1b21593b75384d36604cdbdd469737a152df8`（`observed`，API readback + derived hash）。
- 2026-06-12 live API 读回 `shard1 / W51N21`：`Spawn1` 已放置，controller RCL `1`，两个 worker 已孵化并运行（`observed`，API）。
- 2026-06-12 生产逻辑迭代本地验证通过：新增 300-energy early worker body `[WORK, CARRY, CARRY, MOVE, MOVE]` 选择，以及按 worker 名称在同房间多 source 间确定性分配采集目标；`pnpm check` 和 `pnpm test:screeps-server` 已通过（`derived`，本地测试 + 本地官方 standalone server）。
- 2026-06-12 生产逻辑迭代 live deploy：`pnpm deploy:screeps` 通过，branch `main`，remote modules `main`，module set hash `a1fa2e8221dbadc9741bb2e76e7bdfaa6054a1c73db4e23bc407c51f17dc158f`；rollback snapshot `.screeps/rollback/latest.json` 已保存上一份远端 module set，previous hash `87534439e365323bb9d223627cb1b21593b75384d36604cdbdd469737a152df8`（`observed`，API write + readback + local snapshot）。
- 2026-06-12 生产逻辑迭代 live verify：`pnpm verify:live:screeps` 返回 `apiReadback=main-matched`，branch `main`，localModules `main`，remoteModules `main`，hash `a1fa2e8221dbadc9741bb2e76e7bdfaa6054a1c73db4e23bc407c51f17dc158f`；该脚本不验证自然 tick heartbeat（`observed`，API readback）。
- 2026-06-12 生产逻辑迭代 live room readback：`shard1 / W51N21` 状态 `normal`，`Spawn1` 正在孵化 `Spawn1-worker-71610403`，body `[WORK, CARRY, CARRY, MOVE, MOVE]`；controller RCL `2`，2 个 `[WORK, CARRY, MOVE]` worker 存活，2 个 source 可读，hostile creeps/spawns/towers 均为 `0`（`observed`，API）。

## PTR 代码验证

- PTR 配置文件：`screeps.ptr.json`，被 Git 忽略；示例文件为 `screeps.ptr.example.json`（`derived`，本地脚本契约）。
- PTR API base：`https://screeps.com/ptr/api/`；代码读写 endpoint 为 `https://screeps.com/ptr/api/user/code`，使用 `X-Token` header（`derived`，本地脚本契约 + 官方文档）。
- PTR deploy snapshot path：`.screeps/ptr/latest.json`，被 Git 忽略（`derived`，本地脚本契约）。
- PTR API deploy/readback：2026-06-12 `pnpm deploy:ptr:screeps` 成功部署 branch `main`，remote modules `main`，main hash `9611f3c2a384ca80813c8d79979624bbf8f424efad9e4ecac849c32ac62b6d62`；覆盖前 snapshot 写入 `.screeps/ptr/latest.json`，previous modules `main, main.js.map`，previous hash `62921be9ec157c751d8bdc3a3b7402187ad54af678a42208fcee1221ad0e2945`（`observed`，PTR API write + readback）。
- PTR API readback：2026-06-12 `pnpm verify:ptr:screeps` 返回 `apiReadback=main-matched`，branch `main`，localModules `main`，remoteModules `main`，mainHash `9611f3c2a384ca80813c8d79979624bbf8f424efad9e4ecac849c32ac62b6d62`（`observed`，PTR API readback）。
- PTR current readback：2026-06-12 重新运行 `pnpm verify:ptr:screeps` 失败，原因是 PTR branch `main` 远端 `main` hash 仍为 `9611f3c2a384ca80813c8d79979624bbf8f424efad9e4ecac849c32ac62b6d62`，当前本地 `dist/main.js` hash 为 `87534439e365323bb9d223627cb1b21593b75384d36604cdbdd469737a152df8`（`observed`，PTR API readback + derived hash）。
- PTR CPU 状态：2026-06-12 PTR `/api/auth/me` 返回账号 CPU `80`、`cpuShard = { shard3: 80 }`；PTR `/api/game/shards/info` 返回 `shard3 cpuLimit = 20`、`shard0/shard1/shard2 cpuLimit = 0`（`observed`，PTR API）。
- PTR room 状态：2026-06-12 PTR `user/overview?interval=8` 返回 `shard0`、`shard1`、`shard2`、`shard3` 的 `rooms = []`；Chrome 打开 `https://screeps.com/ptr/#!/console` 后被 PTR UI 重定向到 map，页面显示 `Select your room` / `Choose a room to found your colony`（`observed`，PTR API + Chrome UI）。
- PTR runtime 状态：2026-06-12 01:36:50Z 到 01:37:07Z 对 PTR `user/overview?interval=8` 连续采样，`shard2` gametime 从 `75049172` 增至 `75049173`，PTR API 和至少一个 shard 仍响应推进；当前未见 PTR 全环境停摆证据（`observed`，PTR API）。
- PTR natural tick heartbeat：blocked，2026-06-12 未观察到 PTR console 自然 tick；`https://screeps.com/ptr/#!/console` 无法停留在 console，30 秒观察中 DOM 和浏览器 console 均无 `[tick ...]`。当前根因是 PTR 账号无 owned room，代码没有可执行 tick；不是 PTR CPU 订阅未激活，也不是单纯观察方式遗漏（`blocked`，Chrome UI + PTR API）。
- PTR rollback：2026-06-12 未执行；当前 PTR branch 保留本次部署结果，回滚 snapshot 已存在于 `.screeps/ptr/latest.json`（`observed`，本地 snapshot）。

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

以下事实仍未确认，但不阻塞当前初始上线闭环：

- CPU bucket。
- CPU tick limit。

## 下一步生产动作

当前重启房间、spawn、controller、source 采集、spawn 回补、第二只 worker 孵化和远端代码 hash 已确认。后续游戏策略可以读取这些事实作为 `docs/game-state.md` 记录的生产状态；新增策略仍应通过 Memory 边界和小行为切片进入。
