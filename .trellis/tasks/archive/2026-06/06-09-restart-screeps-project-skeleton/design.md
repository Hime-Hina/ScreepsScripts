# Design

## 技术栈

- 包管理器：`pnpm`。原因是 TypeScript/Rollup/ESLint/Vitest 生态支持稳定，当前机器已安装 `pnpm 10.20.0`，且用户明确排除 `npm`。
- 构建：Rollup 输出 `dist/main.js`，格式为 CommonJS。Screeps 入口只需要导出 `loop`。
- 语言：运行时代码只写 TypeScript。构建配置使用 ESM JavaScript 配置文件。
- 测试：Vitest。unit/integration 覆盖源码行为；system/e2e 覆盖项目脚本和构建产物。
- Lint：ESLint flat config。依据 ESLint 官方当前文档，使用 `eslint.config.mjs`，本地安装 ESLint 依赖，不使用 `.eslintrc`。

## 目录边界

- `src/main.ts`：Screeps 唯一入口，只组装边界，不承载策略。
- `src/runtime/`：封装 Screeps 全局对象读取，避免策略代码直接散落依赖 `Game`、`Memory`、`console`。
- `src/kernel/`：tick 级核心调度入口。第一版只保留可观测心跳。
- `test/unit/`：验证纯逻辑公开接口。
- `test/integration/`：验证 Screeps 入口与全局边界协作。
- `test/system/`：验证项目级约束。
- `test/e2e/`：验证构建产物可作为 Screeps bundle 执行。
- `docs/`：人类可读项目文档和 ADR。
- `references/`：本地资料库入口；外部仓库默认不提交。

## 第一条 TDD 切片

公开接口：`runTick(runtime)`。

行为：

- 读取 tick 时间和 CPU 起始消耗。
- 写出一条稳定格式的 tick 日志。
- 返回 tick telemetry，便于后续系统测试和可视化。

这个切片只证明“源码、测试、构建、bundle 执行”闭环成立，不把未来调度器或 colony 模型提前塞入接口。

## 不做的事

- 不添加兼容旧代码的迁移层。
- 不保留旧 `src/Roles` 设计。
- 不把未确定的策略参数做成 flag、mode 或 options。
- 不在第一版实现房间选择、自动 spawn、远程采矿、市场或战斗。
