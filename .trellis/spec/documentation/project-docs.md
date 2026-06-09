# Project Docs

## Required Documents

Maintain these documents as human-readable sources of truth:

- `README.md`: short project status, commands, and documentation map.
- `CONTEXT.md`: domain language, current architecture rules, and active constraints.
- `docs/architecture.md`: runtime flow, test layers, and expansion rules.
- `docs/development.md`: local setup, commands, credentials rule, and TDD rule.
- `docs/references.md`: official docs clone and external repositories to study.
- `docs/game-state.md`: current Screeps account, shard, room, deployment, and blocked facts.

## Update Triggers

Update docs in the same task when a change:

- Adds or removes a source directory.
- Changes `loop`, runtime boundary, or tick orchestration.
- Adds a test layer or changes `pnpm check`.
- Changes package manager, build, lint, format, or deployment behavior.
- Learns or changes live Screeps state.
- Adopts an external pattern from official docs or player code.

Do not leave onboarding knowledge only in chat or task notes.

When `docs/game-state.md` records a production fact, `README.md` and `CONTEXT.md` must not keep a contradictory summary.

## Style

Keep docs factual and concrete. Use file paths, commands, known game facts, and blocked facts. Avoid broad claims that cannot be verified from code, tests, ADRs, or references.

## Language

Human-facing project documents must be written in Simplified Chinese by default:

- `README.md`
- `CONTEXT.md`
- `docs/**/*.md`
- Trellis task artifacts such as `prd.md`, `design.md`, and `implement.md`

Keep code identifiers, commands, file paths, API names, Screeps constants, branch names, labels, and error messages in their original form.

Machine-readable task files such as `task.json`, `implement.jsonl`, and `check.jsonl` may remain in their required structured format.
