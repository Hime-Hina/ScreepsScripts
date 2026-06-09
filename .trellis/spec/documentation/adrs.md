# ADRs

## When to Write an ADR

Write or update an ADR when a decision changes durable project direction:

- Package manager or build system.
- Test strategy or coverage gate.
- Runtime boundary ownership.
- Memory schema.
- Deployment branch and rollback policy.
- Adoption of a mature external architecture pattern.
- WASM generation or non-TypeScript implementation source.

Current references:

- `docs/adr/0001-rebuild-from-empty-screeps-codebase.md`
- `docs/adr/0002-use-pnpm-rollup-vitest-eslint-flat-config.md`

## ADR Scope

An ADR records the decision and consequences. It is not an implementation checklist.

Keep temporary task execution details in `.trellis/tasks/`; keep durable conventions in `.trellis/spec/`.
