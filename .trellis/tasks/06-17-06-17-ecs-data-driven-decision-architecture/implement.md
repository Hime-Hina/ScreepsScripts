# Implementation plan: ECS-inspired data-driven decision architecture

## Phase 0 — Discussion gate

- Ask local Codex for an independent read-only architecture review and task-train proposal. Done in `job-43`.
- Present Hermes + Codex synthesis to the user. Done; user accepted docs-only ECS naming and early `src/intents/` as a direction.
- Keep all planning artifacts on temporary branch `temp/ecs-data-driven-decision-architecture` until explicitly merged.
- Wait for user approval before editing production code.

## Phase 1 — Specs and docs

Likely files:

- `.trellis/spec/runtime/data-driven-architecture.md` or `.trellis/spec/runtime/decision-architecture.md`
- `.trellis/spec/runtime/domain-boundaries.md`
- `.trellis/spec/runtime/index.md`
- `.trellis/spec/testing/behavior-slices.md`
- `docs/architecture.md`
- possibly `docs/adr/0003-ecs-inspired-data-driven-decision-architecture.md`

Verification:

```bash
python ./.trellis/scripts/task.py validate 06-17-06-17-ecs-data-driven-decision-architecture
pnpm check
```

## Phase 2 — Naming cleanup

Only after user approval. Prefer no behavior changes.

Potential focus:

- Document when to use `Snapshot`, `WorldSnapshot`, `Decision`, `Intent`, `Request`, and `Resolver`.
- Rename only misleading internal variables/interfaces if the diff is small and tests protect behavior.
- Preserve existing public module functions such as `planRoomConstruction` unless discussion decides otherwise.

Verification:

```bash
pnpm vitest run test/unit test/integration
pnpm check
git diff --check
```

## Phase 3 — Future child tasks

Candidates after discussion:

1. `data-driven-architecture-specs-docs`
2. `decision-naming-contract-cleanup`
3. `creep-intent-resolver-foundation`
4. `intent-contract-foundation` for a small `src/intents/` boundary, if approved
5. `world-projection-adr` or explicit decision to defer shared world model

## Current user decisions

- ECS terms should be explained briefly in docs only; production code should not adopt `Entity`, `Component`, or `System` names.
- `src/intents/` may be created early, but should remain a narrow typed contract/resolver boundary.
- Future world projection needs explanation before a code task is approved.
- `UnknownRoomPolicy` needs explanation before deciding whether it belongs in a separate audit task.

## Current status

User discussion is in progress; do not start code edits beyond planning docs until the next approval.
