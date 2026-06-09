# 实现 Memory 边界

## Goal

实现 Memory schema、version、迁移和写回边界，防止运行态状态散落。

## Confirmed Facts

- 当前源码没有读取或写入 Screeps `Memory`。
- `.trellis/spec/runtime/memory-schema.md` 要求 raw `Memory` 只能在单一边界校验、迁移和写回。
- `src/main.ts` 当前只捕获 runtime 并调用 `runTick`。
- `src/kernel/run-tick.ts` 当前接收 `ScreepsTickRuntime` 并输出 heartbeat telemetry。

## Requirements

- 新增单一 `Memory` 边界，拥有 schema version、raw decode、migration、typed state 和 writeback。
- runtime boundary 捕获 raw Screeps `Memory`，策略和 kernel 不直接读取全局 `Memory`。
- 当前没有 documented legacy memory shape；缺失 project root 应创建 current empty state，future schema version 必须 fail visibly。
- writeback 必须保持 schema version，并通过测试证明持久化状态发生变化。
- 不添加 creep、room、spawn 策略；只建立状态边界。

## Acceptance Criteria

- [ ] `src/memory/` 或同等明确边界拥有 schema version 和 raw memory conversion。
- [ ] `src/kernel/` 只接收 typed memory state 或完整 memory operation 的结果，不解析 raw `Memory`。
- [ ] 单元测试覆盖 valid current memory、missing root、future schema version、invalid field、writeback。
- [ ] 集成或入口测试证明 `loop` 通过 runtime/memory 边界运行。
- [ ] `docs/architecture.md` 和相关 spec/docs 如有变化保持同步。
- [ ] focused tests 和 `pnpm check` 通过。

## Notes

- 迁移是边界操作，不是策略模块里的兼容分支。
