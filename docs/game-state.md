# 游戏状态

## 当前状态

2026-06-13 通过 Screeps API 和 console websocket 更新。

- 账号：`Dragon_King`（`observed`，API / 既有 UI 记录）
- 世界：Persistent World（`observed`，既有 UI 记录）
- Account CPU shard 配置：`shard1 = 20`（`observed`，`/api/auth/me`）
- Runtime heartbeat CPU snapshot：`cpu=0.09`、`bucket=10000`、`limit=20`、`tickLimit=500`、`budget=full`（`observed`，2026-06-13 `status:live:screeps` console websocket）。
- Recovery read-only summary：`recoveryStates=W51N21:roomHealthy`、`recoveryBlockers=-`（`observed`，2026-06-13 `status:live:screeps`）。
- `shards/info` 运行态 `cpuLimit` 仍显示旧值 `shard3 = 20`、`shard1 = 0`；实际执行以账号 `cpuShard` 配置和新房间 live 行为为准（`observed`，API）。
- Active production room：`shard1 / W51N21`（`observed`，API）。
- Spawn：`Spawn1`，位置 `35,23`，energy `300/300`，当前未 spawning（`observed`，API）。
- Controller：位置 `26,7`，RCL `2`，progress `9626`，API room-object `downgradeTime = 71652741`，API room-object field `safeMode = 71622765`，safe mode available `1`（`observed`，API）。当前用户确认 room safe mode 已过期；API room-object 中 `safeModeCooldown = 60510881`、`upgradeBlocked = 58760194` 是 room-object 读回字段，不等同于 runtime sandbox 的 remaining-tick 字段（`observed`，API；`derived`，字段语义限制）。
- Sources：两个 source 可读（`observed`，API）。
- Creeps：
  - `Spawn1-worker-71623926`，body `[WORK, CARRY, CARRY, MOVE, MOVE]`，最后读回位置 `34,6`，carry energy `95`（`observed`，API）。
  - `Spawn1-worker-71624035`，body `[WORK, CARRY, CARRY, MOVE, MOVE]`，最后读回位置 `28,38`，carry energy `95`（`observed`，API）。
  - `Spawn1-worker-71624168`，body `[WORK, CARRY, CARRY, MOVE, MOVE]`，最后读回位置 `36,12`，carry energy `95`（`observed`，API）。
  - `Spawn1-worker-71624273`，body `[WORK, CARRY, CARRY, MOVE, MOVE]`，最后读回位置 `37,29`，carry energy `100`（`observed`，API）。
  - `Spawn1-worker-71624390`，body `[WORK, CARRY, CARRY, MOVE, MOVE]`，最后读回位置 `33,5`，carry energy `100`（`observed`，API）。
- Extension construction sites：`4` 个，aggregate progress `2345/12000`（`observed`，API）。
- Runtime heartbeat room summary：`W51N21:workers=5:spawnEnergy=350/350:construction=4:hostiles=0`，证明首个 extension 完工后 runtime boundary 正确捕获 spawn + extension 总容量且自然 tick 未再出现 energy capacity 报错（`observed`，console websocket）。
- 自持循环证据：controller 已升级到 RCL `2`，RCL2 planner 已创建 5 个 extension construction site，worker 已开始 build，spawn/extension 补能和后续升级路径由 runtime boundary 执行（`observed`，API + derived source behavior）。
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
- Module set SHA-256：`5767d8ab577eba0e8279069695591ef85ba61128c84508faaf22537f75bd1748`（`derived`）。
- 本地 `dist/main.js` 文件 SHA-256：`d547bdd264313a100d9e34da43d7455d83dfb7bfb4ca3ef84caa3c51e817a1b8`（`derived`）。
- Rollback path：`pnpm rollback:screeps` 从 `.screeps/rollback/latest.json` 恢复同一 branch 的上一份远端 module set，并用 API readback 校验（`derived`，本地脚本契约；尚未执行 live rollback）。
- Previous remote hash：`1390d63ac0a329c9d0fb591d84b7670f04ce89a6b946cfc11b3a1d17512a335f`（`derived`，deploy snapshot hash）。
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
- 2026-06-12 RCL2 economic infrastructure live deploy：`pnpm deploy:screeps` 通过，branch `main`，remote modules `main`，module set hash `da64ae0bcfb5654642568b941e0aa6a578933fb0220ea417646979495865ae83`；rollback snapshot `.screeps/rollback/latest.json` 已保存上一份远端 module set，previous hash `a1fa2e8221dbadc9741bb2e76e7bdfaa6054a1c73db4e23bc407c51f17dc158f`（`observed`，API write + readback + local snapshot）。
- 2026-06-12 RCL2 economic infrastructure live verify：`pnpm verify:live:screeps` 返回 `apiReadback=main-matched`，branch `main`，localModules `main`，remoteModules `main`，hash `da64ae0bcfb5654642568b941e0aa6a578933fb0220ea417646979495865ae83`；本地 `dist/main.js` 文件 SHA-256 为 `f7a964cd20caa2e49c8c08629cc5263f57c7aab4befebdfff7a3ccb1c7523006`；该脚本不验证自然 tick heartbeat（`observed`，API readback + derived hash）。
- 2026-06-12 RCL2 economic infrastructure room readback：`shard1 / W51N21` 状态 `normal`，`Spawn1` energy `300` 且未 spawning，controller RCL `2` progress `9287`，3 个 worker 存活，5 个 extension construction site 已创建，其中 `36,23` progress `5/3000`，证明 planner 已 live 创建 site 且 worker 已开始 build（`observed`，API）。
- 2026-06-12 P0 controller downgrade guard 本地实现：runtime worker snapshot 捕获 owned controller `level` 和 `ticksToDowngrade`；worker 在 controller `ticksToDowngrade < 5000` 时让所有满能 worker upgrade，在 `< 8000` warning 和 `< 9000` recovering 时让同房间按 creep name 排序的第一个满能 worker upgrade，spawn/extension refill 仍优先于 downgrade upgrade，`9000+` safe 时保持 build before upgrade（`derived`，本地源码 + focused tests）。
- 2026-06-12 P0 controller downgrade guard live deploy：`pnpm deploy:screeps` 通过，branch `main`，remote modules `main`，module set hash `6a0ffb2b8decf9660fe8e6ea17de14c167c03d2c206d32308ea4eb25a48565a3`；rollback snapshot `.screeps/rollback/latest.json` 已保存上一份远端 module set，previous hash `da64ae0bcfb5654642568b941e0aa6a578933fb0220ea417646979495865ae83`（`observed`，API write + readback + local snapshot）。
- 2026-06-12 P0 controller downgrade guard live verify：首次 `pnpm verify:live:screeps` 在 build 后因 `fetch failed` 失败；重试通过并返回 `apiReadback=main-matched`，branch `main`，localModules `main`，remoteModules `main`，hash `6a0ffb2b8decf9660fe8e6ea17de14c167c03d2c206d32308ea4eb25a48565a3`；本地 `dist/main.js` 文件 SHA-256 为 `ca721b35531ac9e8c0867b202654d3439adb39c96152c25f0e671e66dc70edb4`；该脚本不验证自然 tick heartbeat（`observed`，API readback + derived hash）。
- 2026-06-12 P0 controller downgrade guard room readback：`shard1 / W51N21` controller RCL `2`，API room object 暴露 `downgradeTime` 绝对 tick 而非 runtime `ticksToDowngrade` 字段；两次只读采样中 controller progress `9295 -> 9306`，`downgradeTime` `71622185 -> 71623296`，extension site `36,23` progress `670/3000 -> 675/3000`，3 个 worker 存活，说明部署后 controller downgrade timer 正被 upgrade 推高，且 construction 仍继续推进（`observed`，API room-objects）。
- 2026-06-12 P0 controller downgrade guard final room check：远端 `main` module set hash 仍为 `6a0ffb2b8decf9660fe8e6ea17de14c167c03d2c206d32308ea4eb25a48565a3`；`shard1 / W51N21` controller RCL `2` progress `9340`，`downgradeTime` `71626730`，`Spawn1` energy `300` 且未 spawning，3 个 worker 存活，extension site `36,23` progress `865/3000`，确认 P0 guard 已在 live branch 上运行且保级 upgrade 与 construction 均在继续（`observed`，API readback + room-objects）。
- 2026-06-13 P1 economic fallback live deploy：`pnpm deploy:screeps` 通过，先执行 `pnpm check` 和 build；branch `main`，remote modules `main`，module set hash `6c1869574d8677c424c4a209f2892895ee72ac57f037eb10ddd86cd8d22f0beb`；rollback snapshot `.screeps/rollback/latest.json` 已保存上一份远端 module set，previous hash `6a0ffb2b8decf9660fe8e6ea17de14c167c03d2c206d32308ea4eb25a48565a3`（`observed`，API write + readback + local snapshot）。
- 2026-06-13 P1 economic fallback live verify：`pnpm verify:live:screeps` 返回 `apiReadback=main-matched`，branch `main`，localModules `main`，remoteModules `main`，hash `6c1869574d8677c424c4a209f2892895ee72ac57f037eb10ddd86cd8d22f0beb`；该脚本不验证自然 tick heartbeat（`observed`，API readback）。
- 2026-06-13 P1 economic fallback room readback：两次只读采样确认远端 `main` module set hash 均为 `6c1869574d8677c424c4a209f2892895ee72ac57f037eb10ddd86cd8d22f0beb`；`shard1 / W51N21` controller RCL `2` progress `9388 -> 9394`，`downgradeTime` `71631578 -> 71632184`；`Spawn1` energy `169/300 -> 202/300` 且未 spawning；3 个 worker 存活；5 个 extension construction site 仍存在，其中 `36,23` progress `1440/3000 -> 1440/3000`。当前 readback 表明 P1 部署后在 spawn/extension refill 未稳定时 construction 未继续消耗能量，controller safety 仍继续提升；RCL2 expansion target `5` 尚未触发，因为经济安全条件未满足（`observed`，API readback + room-objects）。
- 2026-06-13 P2 structure maintenance local implementation：本地源码已让 runtime boundary 捕获 owned room 中已有 spawn/extension/container/road 的 `hits/hitsMax` repair target snapshot，并通过 runtime boundary 执行 `Creep.repair`；worker 优先级为 harvest/energy acquisition、spawn/extension refill、P0 controller emergency upgrade、critical repair、build、upgrade；wall/rampart 不进入 P2 repair target。`pnpm check` 已通过（`derived`，本地源码 + 本地测试）。
- 2026-06-13 P2 structure maintenance live deploy：`pnpm deploy:screeps` 通过，先执行 `pnpm check` 和 build；branch `main`，remote modules `main`，module set hash `1d4e199722571f10f987440d50b532c6a9e4903b574c21bd8bfbd7b3948795de`；rollback snapshot `.screeps/rollback/latest.json` 已保存上一份远端 module set，previous hash `6c1869574d8677c424c4a209f2892895ee72ac57f037eb10ddd86cd8d22f0beb`（`observed`，API write + readback + local snapshot）。
- 2026-06-13 P2 structure maintenance live verify：`pnpm verify:live:screeps` 返回 `apiReadback=main-matched`，branch `main`，localModules `main`，remoteModules `main`，hash `1d4e199722571f10f987440d50b532c6a9e4903b574c21bd8bfbd7b3948795de`；该脚本不验证自然 tick heartbeat（`observed`，API readback）。
- 2026-06-13 P2 structure maintenance room readback：两次只读采样确认远端状态继续推进；`shard1 / W51N21` controller RCL `2` progress `9402`，`downgradeTime` `71632992`；`Spawn1` at `35,23` hits `5000/5000` 且未 spawning；worker 数量 `4 -> 5`，新增 `Spawn1-worker-71623926`；5 个 extension construction site 仍存在，进度分别为 `30/3000`、`5/3000`、`105/3000`、`35/3000`、`1535/3000`；当前 supported repair backlog 为空，说明 P2 repair path 已部署但本次自然采样没有 damaged spawn/extension/container/road 可触发 `Creep.repair`（`observed`，API readback + room-objects；`blocked`，natural repair action evidence）。
- 2026-06-13 P3 defense fallback local implementation：本地源码已新增 `src/defense/` pure planner；runtime boundary 捕获 owned room hostile creep body/owner/hits/position、controller safe mode fields、spawn/extension/tower core structures，并捕获 `ATTACK_POWER`、`RANGED_ATTACK_POWER`、`DISMANTLE_POWER`、`HEAL_POWER` 等 official combat constants。kernel 先规划 defense，safe mode decision 由 runtime boundary 执行 `controller.activateSafeMode`；有攻击/拆除威胁但未接近核心结构时，`RoomDefenseState` 会让 P1/P2 construction eligibility 返回 `constructionDeferredForDefense`，暂停非关键 build。Tower skeleton 未在本地源码实现，原因是当前已记录 live room 为 RCL `2`，tower 解锁前只保留边界（`derived`，本地源码 + focused tests）。
- 2026-06-13 P3 defense fallback live deploy：`pnpm deploy:screeps` 通过，先执行 `pnpm check` 和 build；branch `main`，remote modules `main`，module set hash `1390d63ac0a329c9d0fb591d84b7670f04ce89a6b946cfc11b3a1d17512a335f`；rollback snapshot `.screeps/rollback/latest.json` 已保存上一份远端 module set，previous hash `1d4e199722571f10f987440d50b532c6a9e4903b574c21bd8bfbd7b3948795de`（`observed`，API write + readback + local snapshot）。
- 2026-06-13 P3 defense fallback live verify：`pnpm verify:live:screeps` 返回 `apiReadback=main-matched`，branch `main`，localModules `main`，remoteModules `main`，hash `1390d63ac0a329c9d0fb591d84b7670f04ce89a6b946cfc11b3a1d17512a335f`；该脚本不验证自然 tick heartbeat（`observed`，API readback）。
- 2026-06-13 P3 defense fallback room readback：首次组合读取 room/status/code endpoint 出现 `fetch failed`，随后单 endpoint 重试成功。两次 room-object 采样确认 `shard1 / W51N21` hostile creeps `0`、hostile spawns `0`、hostile towers `0`；controller RCL `2` progress `9412`，`downgradeTime` `71634002`，API room-object field `safeMode = 71622765`，safe mode available `1`；5 个 worker 存活；extension site `34,22` progress `45 -> 50`，`36,23` progress `1595 -> 1610`，说明部署后经济循环仍推进。当前无 hostile 可触发 natural `activateSafeMode`，safe mode charge 未消耗（`observed`，API room-objects；`blocked`，natural safe mode activation evidence）。
- 2026-06-13 P4 runtime resilience local implementation：本地源码已让 runtime boundary 捕获 `Game.cpu.bucket`、`limit`、`tickLimit` 和 tick start `getUsed()`；kernel 在 bucket `< 2000` 时进入 survival-only budget，保留 defense、emergency spawn 和 controller upgrade，跳过非关键 construction/repair。runtime operation 按 critical/non-critical 分组隔离，critical failure 先 `Game.notify` 后抛出，non-critical failure 通过 `Game.notify` 报告后继续当前 tick。heartbeat 输出 CPU snapshot、budget decision 和每房间 workers/spawnEnergy/construction/hostiles 摘要（`derived`，本地源码 + focused tests）。
- 2026-06-13 P4 runtime resilience local official server e2e：`node scripts/screeps-server/run-suite.mjs case runtime-resilience-monitoring` 通过。`AliceBot / W1N9 / Spawn1` 的自然 tick heartbeat 为 `[tick 2] cpu=3.51 bucket=0 limit=100 tickLimit=100 budget=survival-only rooms=W1N9:workers=0:spawnEnergy=300/300:construction=0:hostiles=0`，证明本地官方 `screeps@4.3.0` engine 中可观察 CPU snapshot、low-bucket survival-only decision 和房间生存摘要（`observed`，local official server e2e）。
- 2026-06-13 P4 live survival status read-only：`pnpm status:live:screeps` 通过，只读输出 branch `main`、`shard1 / W51N21` status `normal`、module hash `1390d63ac0a329c9d0fb591d84b7670f04ce89a6b946cfc11b3a1d17512a335f`、controller RCL `2`、API `controllerDowngradeTime=71647863`、controller progress `9550`、workerCount `5`、spawnEnergy `300/300`、spawning `no`、constructionSites `5`、constructionProgress `4435/15000`、hostile creeps/spawns/towers 均为 `0`。该命令不部署 P4，不证明 P4 已在 live tick 执行（`observed`，API readback）。
- 2026-06-13 P4 runtime resilience live deploy：`pnpm deploy:screeps` 通过，先执行 `pnpm check` 和 build；branch `main`，remote modules `main`，module set hash `5767d8ab577eba0e8279069695591ef85ba61128c84508faaf22537f75bd1748`；rollback snapshot `.screeps/rollback/latest.json` 已保存上一份远端 module set，previous hash `1390d63ac0a329c9d0fb591d84b7670f04ce89a6b946cfc11b3a1d17512a335f`（`observed`，API write + readback + local snapshot）。
- 2026-06-13 P4 runtime resilience live verify：`pnpm verify:live:screeps` 返回 `apiReadback=main-matched`，branch `main`，localModules `main`，remoteModules `main`，hash `5767d8ab577eba0e8279069695591ef85ba61128c84508faaf22537f75bd1748`；该脚本不验证自然 tick heartbeat（`observed`，API readback）。
- 2026-06-13 P4 runtime resilience live status：`pnpm status:live:screeps` 通过，只读输出 branch `main`、`shard1 / W51N21` status `normal`、module hash `5767d8ab577eba0e8279069695591ef85ba61128c84508faaf22537f75bd1748`、controller RCL `2`、API `controllerDowngradeTime=71650085`、controller progress `9572`、workerCount `5`、spawnEnergy `269/300`、spawning `no`、constructionSites `5`、constructionProgress `4775/15000`、hostile creeps/spawns/towers 均为 `0`，并通过 live console websocket 观察到自然 P4 heartbeat：`naturalTickHeartbeat=verified`、tick `71640676`、CPU `0.10`、bucket `10000`、limit `20`、tickLimit `500`、budget `full`、room summary `W51N21:workers=5:spawnEnergy=269/300:construction=5:hostiles=0`。当前 readback 证明 P4 部署后远端 module hash、API room survival 状态和自然 runtime monitor heartbeat 均已验证；该命令未部署代码、未提交 console expression（`observed`，API readback + console websocket）。
- 2026-06-13 P5 recovery diagnostic local implementation：本地源码已新增 `planRoomRecovery` 纯分类操作，覆盖 `roomHealthy`、`roomDegraded`、`spawnMissing`、`creepPopulationMissing`、`controllerLost` 和 `rebuildBlocked`；当前不生成 `requestRebuildSupport`，不做跨房 pathfinding，也不做 claim（`derived`，本地源码 + focused tests）。
- 2026-06-13 P5 recovery status read-only：`pnpm status:live:screeps` 通过，只读输出 branch `main`、`shard1 / W51N21` status `normal`、module hash `5767d8ab577eba0e8279069695591ef85ba61128c84508faaf22537f75bd1748`、controller RCL `2`、API `controllerDowngradeTime=71651193`、controller progress `9608`、workerCount `5`、spawnEnergy `300/300`、spawning `no`、constructionSites `5`、constructionProgress `5055/15000`、hostile creeps/spawns/towers 均为 `0`、`recoveryStates=W51N21:roomHealthy`、`recoveryBlockers=-`，并通过 live console websocket 观察到自然 P4 heartbeat：tick `71642105`、CPU `0.10`、bucket `10000`、limit `20`、tickLimit `500`、budget `full`、room summary `W51N21:workers=5:spawnEnergy=300/300:construction=5:hostiles=0`。该命令未部署代码、未提交 console expression、未生成 rebuild action（`observed`，API readback + console websocket）。
- 2026-06-13 energy capacity runtime fix local implementation：runtime boundary 不再用 `store.getCapacity(RESOURCE_ENERGY)` 建立 spawn/extension 容量不变量，改用 `SPAWN_ENERGY_CAPACITY` 和 `EXTENSION_ENERGY_CAPACITY[room.controller?.level ?? 0]`；新增 integration regression 覆盖 spawn + extension store capacity 返回 `null` 时 `loop()` 仍输出 `spawnEnergy=300/350`。`pnpm check` 已通过（`derived`，本地源码 + focused tests）。
- 2026-06-13 energy capacity runtime fix live deploy：`pnpm deploy:screeps` 通过，先执行 `pnpm check` 和 build；branch `main`，remote modules `main`，module set hash `a54c183ed600a41dcd8fb427bdc132f18985b00463e355c59cd17dd29f0bb93c`；rollback snapshot `.screeps/rollback/latest.json` 已保存上一份远端 module set，previous hash `5767d8ab577eba0e8279069695591ef85ba61128c84508faaf22537f75bd1748`（`observed`，API write + readback + local snapshot）。
- 2026-06-13 energy capacity runtime fix live verify：`pnpm verify:live:screeps` 返回 `apiReadback=main-matched`，branch `main`，localModules `main`，remoteModules `main`，hash `a54c183ed600a41dcd8fb427bdc132f18985b00463e355c59cd17dd29f0bb93c`；该脚本不验证自然 tick heartbeat（`observed`，API readback）。
- 2026-06-13 energy capacity runtime fix live status：`pnpm status:live:screeps` 通过，只读输出 branch `main`、`shard1 / W51N21` status `normal`、module hash `a54c183ed600a41dcd8fb427bdc132f18985b00463e355c59cd17dd29f0bb93c`、controller RCL `2`、API `controllerDowngradeTime=71652741`、controller progress `9626`、workerCount `5`、spawnEnergy `300/300`、spawning `no`、constructionSites `4`、constructionProgress `2345/12000`、hostile creeps/spawns/towers 均为 `0`、`recoveryStates=W51N21:roomHealthy`、`recoveryBlockers=-`，并通过 live console websocket 观察到自然 heartbeat：tick `71643589`、CPU `0.09`、bucket `10000`、limit `20`、tickLimit `500`、budget `full`、room summary `W51N21:workers=5:spawnEnergy=350/350:construction=4:hostiles=0`。当前 readback 证明修复部署后远端 module hash、API room survival 状态、extension 完工后的 350 总容量 heartbeat 和自然 runtime tick 均已验证（`observed`，API readback + console websocket）。
- 2026-06-22 RCL4 interleaved road/extension layout live deploy：`pnpm deploy:screeps` 通过，branch `main`，remote modules `main`，module set hash `4a8cb08636a351497a85a8547eb808d868fdf08fc7b83ea6ebdb9b35f320a7d8`；rollback snapshot `.screeps/rollback/latest.json` 已保存上一份远端 module set，previous hash `d551d9e75e112c7249d3a09addb80c20ef91d22c9d712bdb44805e5d0419158d`（`observed`，API write + readback + local snapshot）。本轮手动移除了旧 range-3 extension construction sites `32,25`、`33,26`、`38,26`，随后 planner 创建 range-4 extension sites `33,19`、`37,19`、`35,27` 以及交错 road sites；`status:live:screeps` 与短监控确认 `status=normal`、`naturalTickHeartbeat=verified`、`recoveryStates=W51N21:roomHealthy`、`refillAccess=min=2 low=0/23`、construction progress `760/18000 -> 790/18000`（`observed`，console expression + API readback + console websocket）。

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
- 2026-06-13 P3 PTR deploy：`pnpm deploy:ptr:screeps` 通过，branch `main`，remote modules `main`，module set hash `1390d63ac0a329c9d0fb591d84b7670f04ce89a6b946cfc11b3a1d17512a335f`；PTR rollback snapshot `.screeps/ptr/latest.json` 已保存上一份远端 module set，previous hash `9611f3c2a384ca80813c8d79979624bbf8f424efad9e4ecac849c32ac62b6d62`（`observed`，PTR API write + readback + local snapshot）。
- 2026-06-13 PTR room founding：`pnpm found:ptr-room:screeps` 首次返回 `status=spawn-placed room=shard1/W51N21 spawn=Spawn1 x=35 y=23 newbie=true`，随后重复运行返回 `status=already-founded room=shard1/W51N21 spawn=Spawn1 x=35 y=23`；`user/overview?interval=8` 读回 owned room `shard1 / W51N21`（`observed`，PTR API write + readback）。
- 2026-06-13 PTR CPU shard：PTR `/api/auth/me` 返回账号 CPU `80`、`cpuShard = { shard0: 0, shard1: 80, shard2: 0, shard3: 0 }`、`cpuShardUpdatedTime = 1781291450737`，对应本地时间 `2026-06-13 03:10:50 +08:00`，12 小时冷却结束时间 `2026-06-13 15:10:50 +08:00`（`observed`，PTR API）。
- 2026-06-13 PTR Chrome CPU UI：`https://screeps.com/ptr/#!/shards2` 显示 `shard1` 为 `80 CPU assigned`，`shard0/shard2/shard3` 为 `0 CPU assigned`；同一页面 runtime 仍显示 `shard1 No CPU limit`、`shard3 20 CPU limit`，且 `Re-assign CPU` 按钮 disabled（`observed`，Chrome UI）。当前结论：账号级 CPU 已转移到 `shard1`，但 PTR runtime `cpuLimit` 尚未应用到 `shard1`（`derived`）。
- 2026-06-13 PTR CPU write retry：`POST /ptr/api/user/cpu-shards` 在冷却窗口内返回 `error = "too soon"`；官方客户端脚本确认正确请求体为 `{ cpu: { shard0, shard1, shard2, shard3 } }`，不是 `{ cpuShard: ... }`（`observed`，PTR API + Chrome-loaded official JS）。当前不能再次提交 CPU 分配（`blocked`，PTR API）。
- 2026-06-13 PTR room tick readback：对 `shard1 / W51N21` 两次 15 秒间隔 `room-objects` 采样均为 object count `5`、controller RCL `1` progress `0`、creeps `0`、`Spawn1` 未 spawning；`user/memory?shard=shard1` root memory 为空，`screepsScripts` path 无 data（`observed`，PTR API）。当前 PTR 自然 tick blocked，根因是 runtime CPU 仍未在 `shard1` 生效；不是账号级 CPU 未转移，也不是房间不存在（`blocked`，PTR API + Chrome UI）。
- 2026-06-13 PTR console probe：`POST /ptr/api/user/console` 正确请求体为 `{ shard, expression }`，只读表达式 `Game.cpu.shardLimits` 可入队；由于 `shard1` 不 tick，console 表达式不会执行，不能用 console 迁移 CPU（`observed`，PTR API；`blocked`，runtime CPU 未生效）。
- 2026-06-13 P3 PTR hostile drill：blocked，PTR 已有目标房间和 P3 代码 hash，但 `shard1` 无自然 tick，且未取得可授权的 PTR hostile 创建机制；不能把本地 server fallback 记为 PTR 成功（`blocked`，PTR API + Chrome UI）。
- 2026-06-13 P3 local official server fallback：本地官方 `screeps@4.3.0` server 已覆盖三类防御演练 case。`defense-core-threat-safe-mode` 使用 `defense-core-threat` fixture，在 `AliceBot / W1N9 / Spawn1` 附近 seed 含 active `attack` / `work` 的 `MichaelBot-core-threat`，自然 tick 后记录 `safe-mode-intent`、`safe-mode-accepted`、`safe-mode-active`，controller `safeMode=20002`、`safeModeAvailable=0`。`defense-harmless-scout-continues` 使用 `defense-harmless-scout` fixture，在核心附近 seed MOVE-only `MichaelBot-harmless-scout`，自然 tick 后记录 gameTime `2` 的 `defense-no-safe-mode`，extension construction site progress `0 -> 5`。`defense-distant-threat-defers-build` 使用 `defense-distant-threat` fixture，在远离核心处 seed 含 active `attack` / `work` 的 `MichaelBot-distant-threat`，自然 tick 后记录 gameTime `2` 的 `defense-no-safe-mode`，extension construction site progress 保持 `0` 且 controller progress `0 -> 3`，说明非关键 build 被 defense fallback 暂停并回退到 upgrade（`observed`，local official server e2e）。
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

当前 P4 runtime heartbeat 已通过 live console websocket 观察到 CPU bucket 和 CPU tick limit。P2 自然 repair action 证据暂时 blocked，原因是当前 supported repair backlog 为空。P3 live natural safe mode activation evidence 暂时 blocked，原因是当前 hostile creeps/spawns/towers 均为 `0`，safe mode charge `1` 未消耗。P5 自然 `spawnMissing` / `rebuildBlocked` 证据暂时 blocked，原因是当前 active room `W51N21` 的 `Spawn1` 存在且房间 recovery summary 为 `roomHealthy`；不能为了验证破坏 live spawn。

## 下一步生产动作

当前重启房间、spawn、controller、source 采集、spawn/extension 补能、extension construction site 创建、worker build、P2 critical repair fallback 部署、P3 defense fallback 部署、P4 runtime monitor heartbeat、P5 recovery read-only summary 和远端代码 hash 已确认。P2 自然 repair action 证据暂时 blocked，原因是当前 supported repair backlog 为空。P3 live natural safe mode activation evidence 暂时 blocked，原因是当前 hostile creeps/spawns/towers 均为 `0`，safe mode charge `1` 未消耗。P5 自然 `spawnMissing` / `rebuildBlocked` 证据暂时 blocked，原因是当前 active room spawn 存在；当前代码只提供诊断摘要，不实现跨房 pathfinding 或 claim。P3 PTR hostile drill blocked，原因是 PTR shard1 runtime CPU 尚未生效且不能在 CPU shard 冷却窗口内重提分配；local official server fallback 已验证 near-core dangerous hostile 触发 safe mode、near-core harmless scout 不触发 safe mode 且施工继续、distant dangerous hostile 不触发 safe mode 且暂停非关键 build。后续 road/container planner、wall/rampart fortification、tower 或更完整 base planning 应继续通过 Memory 边界和小行为切片进入。
