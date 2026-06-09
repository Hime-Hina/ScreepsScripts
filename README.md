# ScreepsScripts

从 2021 年旧单房间项目重建的新 TypeScript Screeps AI 代码库。

## 当前状态

- 旧运行时设计已移除。
- 已初始化 Trellis，并采用 TDD 工作流。
- 包管理器为 `pnpm`。
- `src/main.ts` 导出 Screeps `loop`。
- 策略代码尚未实现。
- 可见 shard 已记录为 `shard3`。
- Live Screeps 部署 branch 已记录为 `main`；远端 `main` 已读回，并与本地 `dist/main.js` 一致。
- Owned room、spawn 和自然生产 tick heartbeat 尚未验证。

## 命令

```powershell
pnpm install
pnpm check
pnpm build
```

## 文档

- `CONTEXT.md`：项目语言、当前游戏状态和架构规则。
- `docs/architecture.md`：运行时和测试结构。
- `docs/development.md`：本地开发命令和 TDD 规则。
- `docs/game-state.md`：生产部署前需要记录的事实。
- `docs/references.md`：官方文档克隆和需要研究的外部仓库。
- `docs/adr/`：架构决策。

## 本地参考资料

官方 Screeps 文档已克隆到 `references/screeps-docs/`，并被 Git 忽略。
