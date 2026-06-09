# Testing Guidelines

These rules apply to `test/`, test helpers, and task planning.

## Pre-Development Checklist

- Write one behavior slice before implementation starts.
- Identify the public interface under test.
- Identify boundaries that may be mocked: Screeps globals, file system, time, network, subprocesses, or credentials.
- Confirm which test layer owns the behavior.

## Guides

| Guide | Applies When |
| --- | --- |
| [TDD Workflow](./tdd-workflow.md) | Any behavior implementation or bug fix |
| [Behavior Slices](./behavior-slices.md) | Defining the next red-green-refactor unit |
| [Test Layers](./test-layers.md) | Choosing unit, integration, system, local e2e, or live e2e coverage |
| [Coverage](./coverage.md) | Adding tests, changing thresholds, or reviewing gaps |
| [Completion Definition](./completion-definition.md) | Finishing a Trellis task or reviewing readiness |

## Quality Check

Use the narrowest relevant command first, then the full gate:

```powershell
pnpm test:unit
pnpm test:integration
pnpm test:system
pnpm test:e2e
pnpm check
```
