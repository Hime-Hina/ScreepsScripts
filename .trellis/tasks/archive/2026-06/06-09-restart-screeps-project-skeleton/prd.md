# 重启 Screeps 项目工程骨架

## Goal

建立一个从空仓库开始可验证的 Screeps TypeScript 工程骨架，后续所有游戏策略都能在 Trellis 规范、TDD 切片、自动化测试和人类可读文档约束下迭代。

## Requirements

- 清理旧工程后保留 Git 历史和 Trellis 管理文件。
- 使用 `pnpm` 作为唯一 Node 包管理器；禁止引入 `npm` lockfile 或 `yarn` lockfile。
- TypeScript 是 Screeps 运行时代码的唯一 JavaScript 源语言。
- 使用 Rollup 构建 Screeps 可加载的 `dist/main.js`。
- 使用 ESLint flat config、Prettier、TypeScript strict mode 和 Vitest。
- 测试分为 unit、integration、system、e2e 四类，并能通过脚本独立运行。
- 端到端测试至少覆盖“源码构建为 Screeps bundle 后，bundle 暴露并执行 `loop`”。
- 文档必须说明项目结构、开发命令、当前游戏状态、外部参考资料和后续游戏策略边界。
- 官方 Screeps 文档克隆到本地参考目录，但不提交到仓库。
- 第一版不得提前实现殖民、房间规划、任务调度、战斗或市场系统。

## Acceptance Criteria

- [x] `pnpm install` 能生成 `pnpm-lock.yaml`。
- [x] `pnpm check` 能完成 typecheck、lint、format check、unit/integration coverage、system test 和 local e2e test。
- [x] `pnpm build` 生成 CommonJS 形式的 `dist/main.js`，导出 `loop`。
- [x] `docs/` 和 `CONTEXT.md` 描述当前项目边界和下一阶段开发入口。
- [x] `references/screeps-docs/` 包含本地克隆的 `screeps/docs`。
- [x] Git 工作区只包含新工程骨架、Trellis 文件、文档和旧工程删除记录。

## Notes

- 当前任务只负责工程骨架和本地资料入口，不负责打开游戏客户端、选房间或上线生产代码。
