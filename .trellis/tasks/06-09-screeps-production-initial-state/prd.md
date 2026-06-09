# 确认生产初始状态

## Goal

选择起始房间、spawn 位置和名称，记录到 docs/game-state.md 并验证自然 tick heartbeat。

## Confirmed Facts

- 账号 `Dragon_King`、Persistent World、`shard3`、GCL `6`、CPU limit `20` 已通过 UI 观察记录。
- `shard3 / W16S2` 当前可见且 UI 显示 `Place your spawn`，Owner 为 `None`。
- 还没有 owned room、spawn 名称、controller、sources、exits、mineral、hostile 状态的 confirmed facts。
- API readback 不能证明自然 tick heartbeat；需要放置 spawn 后观察生产 Console。

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

- [ ] `docs/game-state.md` 包含最终起始房间、spawn 位置和 spawn 名称，证据等级明确。
- [ ] 候选房间选择依据可追溯；未选择的明显候选有简短拒绝原因。
- [ ] spawn 放置完成后，自然生产 tick heartbeat 被观察并记录；若无法观察，blocked reason 明确。
- [ ] 没有把 `assumption` 写入生产逻辑。
- [ ] 任务完成前运行文档相关检查和必要本地验证，至少 `pnpm format` 与当前可运行 focused gate。

## Notes

- 房间选择是 live 决策；如果自动化证据不足，应停止并要求用户确认风险，而不是猜测。
