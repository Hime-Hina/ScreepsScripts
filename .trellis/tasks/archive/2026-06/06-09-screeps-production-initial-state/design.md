# 确认生产初始状态 Design

## Boundaries

- `docs/game-state.md` 是生产事实的唯一项目记录位置。
- Chrome/UI 或可工作的 authenticated API 是 live 事实来源；代码不能硬编码房间选择。
- 本任务可以执行 live spawn placement，但必须先确认 rollback path 已存在。

## Selection Criteria

候选房间评估至少记录：

- room ownership 是否可放置。
- source 数量和可达性。
- controller、sources、mineral、exit 拓扑。
- 近期 sign、hostile 或邻近威胁线索。
- spawn 初始位置到 controller/source 的可操作性。
- shard 与当前部署 branch 是否一致。

## Data Flow

```text
live UI/API observation -> candidate notes -> final room/spawn decision -> docs/game-state.md -> heartbeat observation
```

## Contracts

- `observed` 只用于直接看到的 UI/API/Console 事实。
- `derived` 只用于 hash、local artifact 或确定性推导。
- `blocked` 必须说明缺少的外部条件。
- 放置 spawn 后必须再验证自然 tick heartbeat；console 手动 `require('main').loop()` 不替代自然 tick。

## Open Product Decision

Spawn 名称可由本任务推荐；如果用户已有命名偏好，应在 live placement 前替换为用户指定名称。
