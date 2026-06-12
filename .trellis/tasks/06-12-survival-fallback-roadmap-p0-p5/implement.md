# Survival fallback roadmap P0-P5 implementation plan

## Checklist

- [x] Create parent task.
- [x] Create P0-P5 child tasks.
- [x] Link child tasks to parent.
- [x] Fill parent PRD/design/implement.
- [x] Fill all child PRD/design/implement.
- [x] Curate implement/check JSONL manifests.
- [x] Run `task.py validate` for all 6 tasks.
- [x] Review active task list and confirm no task is started.

## Validation Commands

```powershell
python ./.trellis/scripts/task.py validate .trellis/tasks/06-12-survival-fallback-roadmap-p0-p5
python ./.trellis/scripts/task.py validate .trellis/tasks/06-12-p0-controller-downgrade-guard
python ./.trellis/scripts/task.py validate .trellis/tasks/06-12-p1-economic-fallback-construction-backpressure
python ./.trellis/scripts/task.py validate .trellis/tasks/06-12-p2-structure-maintenance-repair-fallback
python ./.trellis/scripts/task.py validate .trellis/tasks/06-12-p3-defense-fallback-safe-mode
python ./.trellis/scripts/task.py validate .trellis/tasks/06-12-p4-runtime-resilience-monitoring-fallback
python ./.trellis/scripts/task.py validate .trellis/tasks/06-12-p5-recovery-rebuild-fallback
```

## Follow-up Before Implementation

- Do not run `task.py start` for P0-P5 until the user explicitly approves implementation.
- Start P0 before P1-P5.
- When starting a child task, read its `prd.md`, `design.md`, `implement.md`, and JSONL manifests before editing.
