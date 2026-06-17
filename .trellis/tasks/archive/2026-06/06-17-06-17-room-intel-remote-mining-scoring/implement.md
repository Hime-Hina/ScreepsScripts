# Implementation plan: Room intel and remote mining candidate scoring

## Preflight

Read:

- `.trellis/spec/research/player-code-research.md`
- `.trellis/spec/runtime/domain-boundaries.md`
- `.trellis/spec/runtime/cpu-budget.md`
- `.trellis/spec/operations/room-scouting.md`
- existing scout scripts/tests under `scripts/` and `test/unit/screeps-scout`.

## Research first

Clone or fetch file excerpts from Overmind, TooAngel, and The International into `references/player-code/` or a task research note. Record license and adoption notes.

## RED

Add unit tests for pure scoring before implementation.

## GREEN

Add the smallest pure scoring module. Do not wire live remote mining decisions yet.

## Verification

```bash
pnpm vitest run test/unit/intel/room-intel.test.ts
pnpm check
git diff --check
python ./.trellis/scripts/task.py validate 06-17-06-17-room-intel-remote-mining-scoring
```
