# Coverage

## Coverage Gate

Run coverage with:

```powershell
pnpm test:coverage
```

Coverage applies to project-owned TypeScript behavior in `src/`. Generated artifacts, third-party references, and ignored local clones are not coverage targets.

## Expected Bar

New behavior should target at least 90% coverage across statements, branches, functions, and lines for the touched runtime modules. If a task cannot meet that bar, document the reason in the task artifact and keep the uncovered boundary explicit.

Do not reduce coverage to make a task pass.

## Meaningful Coverage

Coverage must come from behavior assertions:

- Unit tests for pure decisions.
- Integration tests for boundary collaboration.
- System tests for project contracts.
- Bundle smoke tests for compiled artifact execution.
- Local official server e2e for behavior that requires the real Screeps engine.

Do not add assertions that merely execute lines without checking observable behavior.
