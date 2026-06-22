# Design: Aggressive Layout Task Train

## Architecture Direction

Move from incremental extension-first placement to a road-first base-planning pipeline:

```text
mature-bot research
  -> local room geometry snapshot
  -> candidate anchor / stamp / lattice generation
  -> score candidate layouts
  -> stage construction by RCL and backlog
  -> optional live migration plan
  -> dry-run / operator review / deployment gate
```

## Design Principles

1. **Road skeleton first**: roads define the movement lattice and refill corridors.
2. **Extension pockets second**: extension sites are selected because they are serviceable from road corridors, not because they happen to be empty.
3. **Stamp semantics**: candidate layouts should be transformable by rotation, reflection, and small translation.
4. **Aggressive but gated**: moving built structures or core anchors is allowed in the plan, but execution requires explicit user confirmation and staged safeguards.
5. **Local architecture fit**: preserve pure planner boundaries under `src/construction/`; runtime remains snapshot-driven.
6. **Mature concepts, not copied code**: record source/license posture and adopt ideas only.

## Required Gates

- **Design gate**: before implementation of planner/migration behavior, present the selected design and candidate visual map to the user.
- **Code gate**: focused RED/GREEN tests before implementation and full `pnpm check` before commit.
- **Live gate**: no deploy, PM2 restart, console write, Memory write, or built-structure destruction without explicit approval.
- **Migration gate**: no removal of built extensions/spawn/storage/tower until replacement capacity and rollback limits are documented.
