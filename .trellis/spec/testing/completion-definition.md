# Completion Definition

## Task Completion Gate

A Trellis task that changes code or executable project contracts is complete only when:

- The behavior has a test that fails without the implementation.
- Focused tests for the behavior pass.
- `pnpm check` passes or the exact external blocker is recorded.
- Documentation/spec/ADR impact was reviewed.
- No credentials, tokens, cookies, or `screeps.json` content were committed or printed.
- Live-affecting work recorded live verification or a blocked reason in `docs/game-state.md`.

Docs-only, spec-only, and operations-only tasks do not require a red code test when there is no executable behavior change. They still require:

- The requested document/spec outcome is present.
- Existing docs do not contradict the new source of truth.
- Relevant blocked facts are recorded.
- The appropriate verification command ran or the external blocker is recorded.

## Spec and Docs Review

Before finishing, check:

- Runtime boundary changed -> `.trellis/spec/runtime/` and `docs/architecture.md`.
- Test layer or command changed -> `.trellis/spec/testing/`, `.trellis/spec/tooling/`, and `docs/development.md`.
- Deployment behavior changed -> `.trellis/spec/operations/`, `docs/development.md`, and `docs/game-state.md`.
- Live game fact changed -> `docs/game-state.md`.
- Long-term decision changed -> `docs/adr/`.

Do not mark a task complete because code compiles if the operational or documentation contract is stale.

Before finishing, explicitly check `README.md`, `CONTEXT.md`, and `docs/game-state.md` for contradictory project-state summaries.

## Commit and Archive Boundary

Completion is not the same as checking boxes in `prd.md`.

Before archive:

- Spec review is done.
- Verification result is recorded.
- Commit plan exists or the reason for not committing is explicit.
- Live-affecting tasks record evidence level: `observed`, `derived`, or `blocked`.
