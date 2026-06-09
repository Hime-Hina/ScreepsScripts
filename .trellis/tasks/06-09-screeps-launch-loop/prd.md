# 完成 Screeps 初始上线闭环

## Goal

按部署回滚、生产初始状态、Memory 边界、第一个行为切片顺序完成上线闭环。

## Confirmed Facts

- 当前仓库没有 `deploy:screeps`、`verify:live:screeps`、`rollback:screeps` 脚本。
- `docs/game-state.md` 已记录 `shard3 / W16S2` 是可见但未拥有房间，spawn 尚未放置。
- Screeps `main` branch 已有 API readback 事实，但 rollback path、previous remote hash 和自然 tick heartbeat 仍为 `blocked`。
- 当前 runtime 只输出 tick heartbeat；尚未读取 `Memory`，也没有 spawn/creep 策略。

## Requirements

- 任务按以下顺序推进，每个子任务独立完成验证、提交和归档：
  1. 补部署、验证、回滚脚本。
  2. 确认生产初始状态并记录到 `docs/game-state.md`。
  3. 实现 `Memory` schema/version/迁移/写回边界。
  4. 实现第一个 spawn/creep 行为切片。
- 不在回滚路径明确前执行新的 live deploy。
- 不在 `Memory` 边界完成前实现会持久化 creep、room、spawn 状态的策略代码。
- 不硬编码尚未观察或记录的生产房间、spawn 名称、source、exit、mineral 或 hostile 事实。

## Acceptance Criteria

- [ ] 四个子任务都存在于 Trellis，并链接到本父任务。
- [ ] 每个子任务有可验证的 PRD；涉及代码或 live 操作的子任务有 `design.md` 和 `implement.md`。
- [ ] 每个子任务完成后都有独立 Git commit。
- [ ] 最终 `docs/game-state.md` 与当前生产事实一致，没有把 blocked 或 assumption 写成 observed。
- [ ] 最终本地验证门槛满足 `pnpm check`，或外部 live blocker 被明确记录。

## Out of Scope

- 完整经济系统、自动寻路、战斗、市场、跨 shard 行为。
- 为旧 role-based 代码或旧部署方式保留兼容层。

## Notes

- 子任务之间的顺序是执行约束，不由 Trellis 父子关系隐含。
