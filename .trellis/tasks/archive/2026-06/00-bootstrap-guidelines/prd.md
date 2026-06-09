# 初始化项目规范文档

## 目标

为 ScreepsScripts 填充项目级 Trellis 规范，让后续 AI 开发会话不再依赖默认 fullstack 模板，而是按当前 Screeps TypeScript 代码库的真实边界工作。

## 范围

- 移除不适用的默认 `backend/frontend` 规范模板。
- 建立 Screeps 项目实际规范层。
- 记录包管理器、工具链、测试、文档、运行时边界、部署运维、外部资料研究等约束。
- 保证 `docs/` 和 Trellis 任务文档面向人类阅读时默认使用简体中文。

## 已完成

- [x] `.trellis/spec/runtime/`：运行时边界、Memory schema、领域模块边界、CPU/bucket 预算、TypeScript 和诊断规则。
- [x] `.trellis/spec/testing/`：TDD、行为切片、测试层、覆盖率和任务完成定义。
- [x] `.trellis/spec/tooling/`：`pnpm`、ESLint flat config、Prettier、build/typecheck、CI/local hooks。
- [x] `.trellis/spec/documentation/`：项目文档、游戏状态、事实可信度、文档同步、ADR 和语言约定。
- [x] `.trellis/spec/research/`：官方 Screeps 文档、本地参考资料和玩家代码研究规则。
- [x] `.trellis/spec/operations/`：部署、live verification、rollback 和 credentials。
- [x] `.trellis/spec/guides/` 已按 Screeps 项目触发条件调整。
- [x] `README.md`、`CONTEXT.md`、`docs/**/*.md` 已改为中文。
- [x] 当前 Trellis 任务文档 `prd.md`、`design.md`、`implement.md` 已改为中文。

## 验收标准

- [x] `python ./.trellis/scripts/get_context.py --mode packages` 只显示当前项目适用的 spec 层。
- [x] `.trellis/spec/` 中无默认模板占位内容。
- [x] `pnpm format` 通过。
- [x] `pnpm check` 通过。

## 备注

- 沙箱内运行 `pnpm check` 时，Vitest/Vite 会因子进程 `spawn EPERM` 失败；沙箱外重跑已通过。
- `bootstrap` 任务本身没有代码实现切片，属于 docs/spec 初始化任务，不需要红绿测试。
