# Documentation Guidelines

These rules apply to human-readable project documents, ADRs, and game-state notes.

## Pre-Development Checklist

- Read `README.md`, `CONTEXT.md`, and the relevant `docs/*.md` before changing architecture or game behavior.
- Check whether the task changes project structure, runtime flow, commands, external references, or production game state.
- Plan the documentation update in the same behavior slice when the change affects project language or onboarding.

## Guides

| Guide | Applies When |
| --- | --- |
| [Project Docs](./project-docs.md) | Updating README, architecture, development, references, or onboarding docs |
| [Game State](./game-state.md) | Recording live Screeps state or production deployment facts |
| [Fact Confidence](./fact-confidence.md) | Labeling observed, derived, blocked, and assumed game facts |
| [Documentation Synchronization](./synchronization.md) | Deciding which docs/specs/ADRs change with code |
| [ADRs](./adrs.md) | Recording durable architecture or tooling decisions |

## Quality Check

Documentation is incomplete when a new contributor cannot answer:

- What is the current runtime shape?
- Which command verifies the change?
- What live Screeps facts are known, blocked, or unsafe to assume?
- Which external reference informed a non-obvious decision?
