# P4 runtime resilience and monitoring fallback

## Goal

增加 runtime 级兜底：CPU/bucket 降级运行、关键异常隔离、告警和 live monitor 事实记录，避免单个 stale object 或昂贵扫描导致整 tick 失败或生产风险无人发现。

## Parent

- `.trellis/tasks/06-12-survival-fallback-roadmap-p0-p5`

## Dependencies

- P0 controller downgrade guard live。
- P1 提供关键 room economy/survival signal 后，P4 才能准确划分 critical/non-critical work。
- P4 可先做研究和设计；代码接入 runtime/kernel 时不能与 P1/P2/P3 并行。

## Requirements

1. CPU and bucket snapshot
   - runtime 捕获 `Game.cpu.limit`、`Game.cpu.tickLimit`、`Game.cpu.bucket`、`Game.cpu.getUsed()`。
   - degraded rule 明确：低 bucket 时跳过 non-critical work，保留 spawn/refill/P0 upgrade/critical defense。

2. Runtime error isolation
   - 单个 non-critical decision 执行失败时不能让整 tick 停止。
   - Critical action failure 必须可见，不允许静默吞掉。
   - 错误处理应围绕完整操作，不在内部到处加 `if undefined return`。

3. Alerts and monitors
   - 支持关键条件告警：`ticksToDowngrade` 低、worker count 低、spawn energy 低、hostile present、runtime action failure。
   - 使用 `console.log` 或 `Game.notify` 时必须节流，避免每 tick spam。
   - 告警内容不能包含 secret。

4. Live check workflow
   - 提供只读 live status check 的命令或脚本入口，输出 room survival summary。
   - 不部署、不修改远端代码、不写 token。
   - live check 输出中的 structure/tower/defense 指标应使用 P2/P3 已接入的 official constants contract，不重新硬编码结构 hits、tower power 或 body power 数值。

## Acceptance Criteria

- [ ] Unit tests 覆盖 bucket degraded decision：critical work preserved, non-critical skipped。
- [ ] Unit tests 覆盖 alert throttling。
- [ ] Integration tests 覆盖 non-critical action failure is reported and tick continues。
- [ ] Integration tests 覆盖 critical action failure is visible。
- [ ] Live check 输出 room、controller downgrade、worker count、spawn energy、construction progress、hostile count。
- [ ] Live check 覆盖 P1-P3 official constants 接入后的关键数值来源说明，避免重新引入本地硬编码表。
- [ ] `pnpm check` 通过。

## Out of Scope

- 完整 observability dashboard。
- 外部监控服务或定时自动化。
- 修复所有 runtime action 失败根因。
- CPU 优化大型重构。

## References

- Overmind：critical bucket threshold 下暂停 operation，避免 bucket limbo；try/catch 隔离 colony/network 异常。
- Screeps API：`Game.cpu.bucket`、`Game.notify`、`Game.time`。
- 本仓库 `.trellis/spec/runtime/cpu-budget.md`。
