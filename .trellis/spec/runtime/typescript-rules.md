# TypeScript Rules

## Source Language

Project-owned JavaScript behavior is authored in TypeScript.

Allowed JavaScript or MJS files are limited to tool configuration that must run in Node, such as:

- `eslint.config.mjs`
- `prettier.config.mjs`
- `rollup.config.mjs`

These files must not contain Screeps game logic.

## Runtime Types

Use explicit interfaces for runtime boundaries.

Current reference:

- `ScreepsTickRuntime` describes the tick boundary.
- `TickTelemetry` describes the value returned by `runTick`.

Prefer `readonly` fields for immutable runtime snapshots. Avoid `any`; the current ESLint config treats `@typescript-eslint/no-explicit-any` as an error for project TypeScript.

## Imports

Use type-only imports when importing only TypeScript types. The current ESLint rule `@typescript-eslint/consistent-type-imports` enforces this.

## WASM

WASM is allowed only when a task proves that TypeScript is insufficient for a specific algorithm or performance constraint.

Required shape:

- Keep generator source and generated binary ownership explicit.
- Add a TypeScript wrapper that exposes a typed operation.
- Test the wrapper through public behavior.
- Document the generated artifact and rebuild command.

Do not introduce WASM for speculative optimization.

## Generated Code

Generated files must not become hidden sources of truth. If generated code is committed, document:

- The source input.
- The generator command.
- The reason the generated artifact is committed.
