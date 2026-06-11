# 接入 Screeps 官方 PTR 冒烟验证

## Goal

为官方在线 PTR 增加显式部署/验证边界和冒烟验证流程，用于发布前预发布兼容性检查，并确保它不会进入默认本地门禁或误操作 live 主服。

## Requirements

- PTR 操作必须使用独立命令，不通过 flag、mode 或 options bag 复用 live 部署命令。
- PTR API base 必须明确指向 `https://screeps.com/ptr/api/`，不能由 live `server` 字段拼接推断。
- PTR 凭据和配置必须独立于 live 主服配置，且不能打印 token、cookie 或完整本地配置。
- PTR smoke 必须默认不进入 `pnpm check`。
- PTR 文档必须说明每周一 `00:00 UTC` reset、脚本清空、CPU subscription 需激活、PTR 行为不等同 live 生产验证。
- PTR 验证至少应区分 API readback 与自然 tick 证据。
- 本任务不接入本地 `screeps@ptr` 常规矩阵。

## Acceptance Criteria

- [ ] `package.json` 暴露显式 PTR 命令，例如 `deploy:ptr:screeps` / `verify:ptr:screeps`，且不在 `pnpm check` 中。
- [ ] PTR 配置加载和 live 配置加载边界清晰，不允许 PTR 命令意外命中 live API base。
- [ ] PTR readback 能验证远端 `main` module 与本地 `dist/main.js` 一致。
- [ ] PTR 自然 tick 验证路径明确；如果环境阻塞，记录阻塞原因而不是把 readback 当成 tick 验证。
- [ ] 文档说明 PTR reset、CPU subscription、用途和风险。
- [ ] 没有 token、cookie、完整 `screeps.json` 或 PTR credential 文件进入 Git 或日志。

## Out of Scope

- 不把 PTR 命令加入默认 `pnpm check`。
- 不实现本地 `screeps@ptr`。
- 不改变 live 主服部署/回滚语义。
- 不把 PTR 结果当作 live 生产验证。

## Notes

- 该任务应在本地 standalone server e2e PoC 任务之后实施，避免同时改变本地测试和在线 PTR 操作边界。
