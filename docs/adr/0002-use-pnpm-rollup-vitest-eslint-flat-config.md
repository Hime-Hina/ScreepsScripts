# ADR 0002：使用 pnpm、Rollup、Vitest 和 ESLint Flat Config

## 状态

已接受。

## 背景

项目必须避免使用 `npm`，Screeps 运行时代码使用 TypeScript，并让格式化/lint 配置与当前 ESLint 指南保持一致。

## 决策

- 使用 `pnpm` 作为包管理器。
- 使用 Rollup 将 `src/main.ts` 编译为 CommonJS `dist/main.js`。
- 使用 Vitest 做单元、集成、系统和编译后 bundle smoke 测试。
- 在 `eslint.config.mjs` 中使用 ESLint flat config。
- 使用 Prettier 作为独立格式化工具，不通过 ESLint 运行 Prettier。

## 后果

- 不允许 `package-lock.json` 和 `yarn.lock`。
- Screeps 部署凭据保留在仓库外。
- 在尝试任何 live Screeps 部署前，bundle smoke 先验证编译后 bundle；真实 Screeps engine 验证由独立的本地 server e2e 命令承担。
