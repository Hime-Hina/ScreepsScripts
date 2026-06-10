# 确认生产初始状态

## Goal

选择起始房间、spawn 位置和名称，记录到 docs/game-state.md 并验证自然 tick heartbeat。

## Confirmed Facts

- 账号 `Dragon_King`、Persistent World、`shard3`、GCL `6`、CPU limit `20` 已通过 UI 观察记录。
- `shard3 / W16S2` 是历史打开房间页面，UI 显示 `Place your spawn`，Owner 为 `None`。
- Active production room 已通过 API 记录为 `shard3 / W15S27`。
- Spawn 已通过 API 记录为 `Spawn1` at `44,30`。
- Controller、sources、exits、mineral 和 hostile 状态已通过 API 记录到 `docs/game-state.md`。
- API readback 只证明部署同步；自然 tick heartbeat 已通过 console websocket 观察。

## Requirements

- 在回滚路径明确后再进行 spawn 放置相关 live 操作。
- 选择起始房间时记录候选评估依据，不把未观察事实写成 observed。
- 确认并记录：
  - shard。
  - final starting room。
  - spawn 位置。
  - spawn 名称。
  - room controller、sources、exits、mineral、hostile 事实。
  - active production branch。
  - 自然 tick heartbeat 是否在生产 Console 出现。
- 更新 `docs/game-state.md`，保持 fact confidence 标签。
- 如果外部 UI、认证或游戏状态阻塞放置 spawn，记录 blocked reason。

## Acceptance Criteria

- [x] `docs/game-state.md` 包含最终起始房间、spawn 位置和 spawn 名称，证据等级明确。
- [x] 候选房间选择依据可追溯；未选择的明显候选有简短拒绝原因。
- [x] spawn 放置完成后，自然生产 tick heartbeat 被观察并记录；若无法观察，blocked reason 明确。
- [x] 没有把 `assumption` 写入生产逻辑。
- [x] 任务完成前运行文档相关检查和必要本地验证，至少 `pnpm format` 与当前可运行 focused gate。

## Notes

- 房间选择是 live 决策；如果自动化证据不足，应停止并要求用户确认风险，而不是猜测。
