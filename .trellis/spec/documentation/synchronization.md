# Documentation Synchronization

## Update Matrix

| Change | Check / Update |
| --- | --- |
| `src/main.ts`, `src/runtime/`, or `src/kernel/` | `docs/architecture.md`, `.trellis/spec/runtime/` |
| Test directory, test command, or coverage gate | `docs/architecture.md`, `docs/development.md`, `.trellis/spec/testing/` |
| `package.json` scripts or tool config | `docs/development.md`, `.trellis/spec/tooling/`, `test/system/` |
| Deployment or credentials flow | `docs/development.md`, `docs/game-state.md`, `.trellis/spec/operations/` |
| Live Screeps observation | `docs/game-state.md` |
| External player-code pattern adopted | `docs/references.md`, task `research/`, possibly ADR |
| Long-term architecture decision | `docs/adr/`, relevant `.trellis/spec/` |
| Task planning, design, or implementation plan | Trellis task `prd.md`, `design.md`, `implement.md` in Simplified Chinese |

## Single Source Preference

Avoid maintaining long duplicated explanations.

- Put narrative context in `docs/`.
- Put implementation rules in `.trellis/spec/`.
- Put why a durable decision was made in `docs/adr/`.
- Put one-off research in `.trellis/tasks/*/research/`.

If two documents mention the same concept, one should summarize and point to the owner instead of restating all details.
