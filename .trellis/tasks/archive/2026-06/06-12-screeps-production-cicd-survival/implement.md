# Screeps 生产逻辑与 CI/CD 存活闭环实施计划

## Checklist

- [x] 完成规划评审，确认本轮不添加手动 live deploy workflow。
- [x] `task.py start` 进入实现阶段。
- [x] 读取 `trellis-before-dev` 和相关 runtime/testing/tooling/operations specs。
- [x] 添加 spawn body selection 的失败单元测试。
- [x] 实现最小 spawn body selection。
- [x] 添加 worker 多 source 分配的失败单元测试。
- [x] 实现 worker 多 source 确定性分配。
- [x] 更新 kernel/integration/bundle 测试中受影响的期望。
- [x] 添加 `.github/workflows/check.yml`。
- [x] 添加或更新系统测试，证明 CI workflow 是无凭据默认门禁。
- [x] 更新 README、CONTEXT、docs/spec 中 CI 与生产逻辑描述。
- [x] 跑 focused tests。
- [x] 跑 `pnpm typecheck`、`pnpm lint`、`pnpm test:unit`、`pnpm test:integration`。
- [x] 跑 `pnpm check`。
- [x] 跑 `pnpm test:screeps-server`。
- [ ] 若执行 live deploy，跑 `pnpm deploy:screeps` 和 `pnpm verify:live:screeps`。
- [x] 记录 `docs/game-state.md` 的 live readback、natural tick 或 blocked reason。
- [x] 运行 Trellis check 所需质量门禁。

## Behavior Slices

1. Spawn body slice
   - Public interface: `planBootstrapWorkerSpawn`.
   - Given room energy capacity and available energy permit a balanced 300-energy early worker body.
   - When spawn decision runs below early worker target.
   - Then it returns the balanced `[WORK,CARRY,CARRY,MOVE,MOVE]` body, while still supporting `[WORK,CARRY,MOVE]` recovery.
   - Boundary: no Screeps globals, no Memory.

2. Source distribution slice
   - Public interface: `planBootstrapWorkerActions`.
   - Given one room has multiple workers and multiple sources.
   - When worker actions are planned.
   - Then harvest decisions are distributed across sources deterministically instead of all targeting the first source.
   - Boundary: no pathfinding, no Screeps globals, no Memory.

3. Runtime preservation slice
   - Public interface: `loop` / `runTick`.
   - Given the runtime boundary captures current world snapshots.
   - When one tick runs.
   - Then spawn and worker decisions are executed through runtime methods, and `src/main.ts` remains a thin entrypoint.
   - Boundary: Screeps globals stubbed only at integration layer.

4. CI slice
   - Public interface: `.github/workflows/check.yml` and system test.
   - Given a push or pull request targets the repository.
   - When GitHub Actions runs the default workflow.
   - Then it installs through pnpm frozen lockfile and runs `pnpm check` without Screeps credentials or live/PTR commands.

5. Deployment verification slice
   - Public interface: existing `pnpm deploy:screeps` / `pnpm verify:live:screeps`.
   - Given local gates pass and deployment is explicitly approved by this task scope.
   - When deploy runs.
   - Then remote `main` matches local `dist/main.js` by API readback, and live behavior evidence or blocked reason is recorded.

## Validation Commands

```powershell
pnpm test:unit -- test/unit/spawning/spawn-decision.test.ts
pnpm test:unit -- test/unit/creeps/worker-decision.test.ts
pnpm test:integration -- test/integration/main-loop.test.ts
pnpm test:system
pnpm typecheck
pnpm lint
pnpm test:unit
pnpm test:integration
pnpm check
pnpm test:screeps-server
pnpm deploy:screeps
pnpm verify:live:screeps
```

`pnpm deploy:screeps` 和 `pnpm verify:live:screeps` 只在本地门禁通过后显式执行；本轮不通过 GitHub Actions 执行 live deploy。

## Validation Results

- `pnpm test:unit -- test/unit/spawning/spawn-decision.test.ts`：通过。
- `pnpm test:unit -- test/unit/creeps/worker-decision.test.ts`：通过。
- `pnpm test:integration -- test/integration/main-loop.test.ts`：通过。
- `pnpm test:system`：通过。
- `pnpm typecheck`：通过。
- `pnpm lint`：通过。
- `pnpm test:unit`：通过。
- `pnpm test:integration`：通过。
- `pnpm check`：通过。
- `pnpm test:screeps-server`：通过，smoke suite 通过 `basic-runtime-heartbeat` 和 `memory-schema-write`。
- `pnpm deploy:screeps`：未执行；用户知情后允许执行，但执行环境仍拒绝真实 live 上传。已在 `docs/game-state.md` 记录为 `blocked`。
- `trellis-check`：修复 source assignment 随其他 worker 满包/卸货状态漂移的问题；复跑 `pnpm check` 和 `pnpm test:screeps-server` 通过。

## Risk Points

- 当前工作区已有未提交变更：`.trellis/tasks/archive/2026-06/06-10-screeps-ptr-smoke/implement.md`、`.trellis/workspace/Hime-Hina/journal-1.md`、`docs/game-state.md`。实现时不得覆盖无关内容。
- 强 worker body 不能破坏 200 energy emergency recovery。
- 多 source 分配不能依赖 source 数量总是 2；room 只有 1 个 source 时必须保持可运行。
- CI workflow 不能读取 token、运行 live/PTR 命令或依赖 ignored local files。
- Live deploy 前必须确认 rollback snapshot 路径存在或 deploy 脚本能先捕获远端 module set。
- API readback 不是 natural tick evidence；文档必须分开记录。

## Rollback Points

- CI 添加前：只涉及 task artifacts。
- 生产逻辑实现后、部署前：revert source/test/docs/workflow changes。
- CI workflow 添加后：删除 `.github/workflows/check.yml` 并恢复 docs/spec。
- Live deploy 后：先运行 `pnpm rollback:screeps`，再处理本地代码 revert。
