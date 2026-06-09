# 补部署验证回滚脚本

## Goal

为 Screeps 线上代码建立明确 deploy、verify live、rollback 命令。

## Confirmed Facts

- `package.json` 当前没有 live Screeps 操作脚本。
- 本地构建产物是 `dist/main.js`，Screeps entrypoint 是 `src/main.ts`。
- 本地凭据文件是被 Git 忽略的 `screeps.json`；示例文件是 `screeps.example.json`。
- `docs/game-state.md` 记录 API readback 已证明远端 `main` 与本地 `dist/main.js` 一致，但 rollback path 仍为 `blocked`。
- 远端曾出现 `main.js.map` 模块，模块集 ownership policy 仍未明确。

## Requirements

- `package.json` 暴露三个明确脚本：
  - `deploy:screeps`
  - `verify:live:screeps`
  - `rollback:screeps`
- 部署脚本在替换远端代码前必须：
  - 运行本地验证和重新构建。
  - 读取 `screeps.json`，只输出非 secret 诊断。
  - 捕获目标 branch 的当前远端模块集为 Git 忽略的 rollback snapshot。
  - 上传明确的目标模块，不隐式清理或保留未记录策略的额外模块。
  - readback 远端模块并校验 hash。
- 回滚脚本必须从 snapshot 恢复同一 branch 的上一份远端模块集，并用 readback hash 验证恢复结果。
- verify 脚本只证明 live API readback 与本地构建产物一致；不得声称已经证明自然生产 tick 执行。
- `docs/development.md`、`docs/game-state.md` 和 `screeps.example.json` 必须与脚本契约一致。

## Acceptance Criteria

- [ ] `pnpm deploy:screeps`、`pnpm verify:live:screeps`、`pnpm rollback:screeps` 是存在且语义明确的 package scripts。
- [ ] rollback snapshot 存储路径被 `.gitignore` 忽略。
- [ ] 系统测试覆盖 required scripts 和 ignored credential/snapshot 路径。
- [ ] 单元或集成测试覆盖配置解析、module hash、snapshot branch mismatch、mock Screeps API readback。
- [ ] 脚本错误信息不输出 token、账号密码、cookie 或完整 `screeps.json`。
- [ ] `docs/game-state.md` 记录 rollback path 不再是 blocked，或记录脚本完成但 live 操作未执行的事实级别。
- [ ] 相关验证命令通过： focused test、`pnpm typecheck`、`pnpm lint`、`pnpm test:system`，完成前运行 `pnpm check`。

## Notes

- 本任务建立操作链路；除非显式进入 live 部署步骤，不把实现脚本等同于已经完成自然 tick 验证。
