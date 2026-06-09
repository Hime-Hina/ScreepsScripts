# Implementation Plan

1. 写入工程基础文件：`package.json`、`.npmrc`、`.gitignore`、TypeScript、Rollup、ESLint、Prettier、Vitest 配置。
2. 添加最小 Screeps runtime boundary、tick kernel 和 `main.loop`。
3. 按 TDD 切片添加 unit 与 integration 测试。
4. 添加 system 与 local e2e 测试，覆盖脚本约束和构建产物执行。
5. 添加 `CONTEXT.md`、ADR、开发文档、游戏状态文档和参考资料文档。
6. 安装依赖并生成 `pnpm-lock.yaml`。
7. 克隆 `screeps/docs` 到 `references/screeps-docs/`。
8. 运行 `pnpm check` 验证。
