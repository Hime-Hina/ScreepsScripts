# 领域文档

本仓库使用单一领域上下文：

- `CONTEXT.md` 保存当前项目语言、Screeps 领域假设和架构边界。
- `docs/adr/` 保存架构决策记录。
- `.trellis/tasks/` 保存任务本地 PRD、设计、实现计划和研究记录。

改代码前，先阅读 `CONTEXT.md`、相关 ADR、当前 Trellis 任务，以及 `.trellis/spec/` 下相关包/层规范。

当任务改变长期项目语言或架构规则时，更新 `CONTEXT.md` 或新增 ADR，不要只把决策留在聊天里。
