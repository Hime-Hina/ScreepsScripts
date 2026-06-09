# Fact Confidence

## Evidence Labels

Use these labels for live Screeps facts:

- `observed`: directly confirmed in UI, API, console, or live runtime output.
- `derived`: inferred from deterministic local build, artifact hash, API readback, or code.
- `blocked`: currently cannot be confirmed.
- `assumption`: temporary planning input that must not enter production logic.

## Recording Rule

`docs/game-state.md` should separate facts from assumptions. A blocked fact is better than an unlabeled guess.

For each production-relevant fact, record:

- Evidence label.
- Source: UI, API, console, local build, or task note.
- Date.
- Any limitation.

## Production Rule

Do not hard-code facts labeled `blocked` or `assumption`.

Examples:

- Do not hard-code the starting room until it is `observed`.
- Do not hard-code source count or mineral type while those facts are blocked.
- Do not assume the production branch if `docs/game-state.md` says it needs confirmation.
