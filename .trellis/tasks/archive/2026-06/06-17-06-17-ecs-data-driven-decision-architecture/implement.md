# Implementation plan: ECS-inspired data-driven decision architecture

## Phase 0 — Discussion gate

- Ask local Codex for an independent read-only architecture review and task-train proposal. Done in `job-43`.
- Present Hermes + Codex synthesis to the user. Done; user accepted docs-only ECS naming and early `src/intents/` as a direction.
- Keep all planning artifacts on temporary branch `temp/ecs-data-driven-decision-architecture` until explicitly merged.
- User approved proceeding with the proposed plan; implementation is limited to docs/specs plus a narrow intent contract.

## Phase 1 — Specs and docs

Likely files:

- `.trellis/spec/runtime/decision-architecture.md`
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

Implemented scope in this branch:

- Added docs-only ECS analogy and project naming contract.
- Added `src/intents/creep-intent.ts` with a narrow generic resolver.
- Added resolver unit tests.
- Did not rename existing runtime/kernel/domain public functions.

Verification:

```bash
pnpm vitest run test/unit test/integration
pnpm check
git diff --check
```

## Phase 3 — Future child tasks

Candidates after discussion:

1. `world-projection-adr` or explicit decision to defer shared world model
2. Future behavior-specific migration from direct `WorkerActionDecision` to `CreepIntent<WorkerActionDecision>` when another domain competes for the same creep action.
3. Separate `UnknownRoomPolicy` audit only if the policy grows beyond local intel scoring.

## Current user decisions

- ECS terms should be explained briefly in docs only; production code should not adopt `Entity`, `Component`, or `System` names.
- `src/intents/` may be created early, but should remain a narrow typed contract/resolver boundary.
- Future world projection needs explanation before a code task is approved.
- `UnknownRoomPolicy` needs explanation before deciding whether it belongs in a separate audit task.

## Current status

Implementation started on temporary branch after user approval. Do not deploy; this is docs/specs plus narrow intent contract only.
