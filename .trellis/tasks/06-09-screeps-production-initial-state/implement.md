# 确认生产初始状态 Implementation

## Checklist

- [ ] 确认部署/回滚子任务已完成并提交。
- [ ] 使用 Chrome/UI 或 API 收集候选房间事实。
- [ ] 记录候选比较和最终房间选择。
- [ ] 确认 spawn 位置和名称。
- [ ] 放置 spawn。
- [ ] 观察生产 Console 是否出现自然 tick heartbeat。
- [ ] 更新 `docs/game-state.md`。
- [ ] 运行可用文档/本地验证。
- [ ] Commit 本任务。

## Validation Commands

```powershell
pnpm format
pnpm test:e2e
```

## Rollback Points

- Spawn placement 是游戏内不可用 Git 回滚撤销的 live 操作；如果候选事实不足，不执行放置。
- 如果 heartbeat 未出现，先记录 blocked reason，再诊断部署 branch、active branch 和 Console 过滤条件。
