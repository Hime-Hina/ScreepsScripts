# P5 defense maintenance hardening PRD

## Goal

Harden defense classification and maintenance behavior for RCL4+ without overbuilding walls or draining tower energy.

## Requirements

- Tower repair keeps energy reserve for attack/heal.
- Storage is treated as a core structure for hostile proximity once it exists.
- Far hostile scouts do not make a room unsafe unless they can damage/dismantle near core.
- Near-core damaging/dismantling hostiles remain unsafe and safe-mode eligible.

## Acceptance criteria

- Defense tests cover far damaging hostile as non-critical/no unsafe state.
- Defense tests cover near storage damaging hostile as unsafe/safe-mode candidate.
- Tower reserve tests remain green.
