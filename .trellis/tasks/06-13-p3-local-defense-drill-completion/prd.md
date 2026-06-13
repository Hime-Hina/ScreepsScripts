# P3 local defense drill completion

## Goal

在本地 official Screeps server 中补完 P3 defense fallback 的真实 engine 证据。当前已验证 near-core dangerous hostile 会触发 safe mode；本任务继续覆盖 P3 已实现但尚未在本地 official server 中验证的关键场景，确保本地攻防演练能证明防御策略在自然 tick 下对不同 hostile 类型有正确反应。

本任务不把本地结果伪装成 PTR 成功；PTR 仍因 shard1 runtime CPU 未生效而 blocked。

## Confirmed Facts

- P3 源码已经实现：
  - runtime boundary 捕获 hostile creep owner/body/hits/position、owned controller safe mode 字段、spawn/extension/tower core structures 和 official combat constants。
  - pure defense planner 识别攻击、远程攻击、拆除和治疗威胁。
  - dangerous hostile 靠近核心结构时产出 `activateSafeMode` decision。
  - dangerous hostile 不靠近核心结构时标记 `roomUnsafe`，暂停非关键 construction build。
  - harmless hostile scout 不应激活 safe mode，也不应阻塞 construction。
- 本地 official server 已有 `defense-core-threat-safe-mode` case：
  - fixture `defense-core-threat`
  - hostile `MichaelBot-core-threat`
  - natural tick heartbeat 后观察到 `safe-mode-active`
- 本地 official server 还没有自然 tick 级证据覆盖：
  - harmless hostile near-core 不触发 safe mode 且 construction 继续。
  - dangerous hostile away-from-core 不触发 safe mode 但 construction 被暂停。
  - local status stream 对 P3 `roomUnsafe` / hostile classification / construction behavior 的可观察证据。
- 源码层 integration tests 已覆盖 harmless scout 和 distant dangerous hostile；本任务目标是把这些行为提升到本地 official server engine 证据层。

## Requirements

1. Local official server only
   - 只使用 `scripts/screeps-server/` 本地官方 standalone server harness。
   - 不读取 live / PTR credential，不调用官方 live / PTR API。
   - 结果记录为 local official server evidence，不替代 PTR evidence。

2. Defense scenario coverage
   - 继续保留并验证 near-core dangerous hostile -> safe mode active。
   - 新增 harmless hostile near-core 场景，验证不触发 safe mode，且经济行为不会因 harmless scout 停止。
   - 新增 distant dangerous hostile 场景，验证不触发 safe mode，但非关键 construction build 被暂停或等价地观察到 worker fallback action。
   - 场景必须通过 runner case/fixture registry 表达，不通过 package script 爆炸或 PTR/live flag 切换。

3. Evidence quality
   - 每个本地 case 必须先观察 natural tick heartbeat。
   - status stream 必须给出可审计事件；不能只靠源码层测试推断。
   - 对 safe mode、hostile、construction progression / pause 的证据要能区分不同 scenario。

4. Documentation
   - 更新 `docs/game-state.md`，明确 local official server coverage 增强结果。
   - 如新增 local server fixture/case/status contract，更新 `.trellis/spec/testing/test-layers.md` 或相邻 spec。

## Acceptance Criteria

- [x] PRD 明确 local-only 边界、场景范围和不替代 PTR 的证据分类。
- [x] `design.md` 定义 fixture/case/status event 的边界，不引入 mode/flag 切换 PTR/live。
- [x] `implement.md` 包含红测、实现、local server case、`pnpm check` 的执行计划。
- [x] 新增或扩展系统测试，证明 runner registry 能选择新增 defense cases，并拒绝混合 fixture。
- [x] 本地 official server 至少覆盖：
  - [x] dangerous hostile near core -> safe mode active。
  - [x] harmless hostile near core -> no safe mode, construction/economic path continues。
  - [x] dangerous hostile away from core -> no safe mode, construction build is deferred or fallback action is observed。
- [x] Focused local server case command 通过。
- [x] `pnpm check` 通过。
- [x] `docs/game-state.md` 记录 local official server evidence 和 PTR blocked boundary。
- [x] 不提交或输出 token、cookie、`screeps.json`、`screeps.ptr.json`。

## Scope Decision

- 本任务只验证现有 P3 行为。
- 不新增 tower、defender spawning、主动攻击、kiting 或 combat AI。
- 如果后续需要新增防御能力，应创建独立任务，并重新规划 runtime/domain/test 边界。

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
