# Adaptive bootstrap worker demand PRD

## Goal

Replace the fixed RCL2 development worker target with a dynamic, aggressive demand model using mature-bot patterns already researched: source-income saturation, construction backlog, and body WORK-part throughput.

## Requirements

- Remove dependency on a fixed `RCL2_DEVELOPMENT_WORKER_COUNT = 5` target.
- Keep survival floor semantics: worker count below survival floor produces survival demand.
- When RCL2 controller downgrade is safe, compute development target from:
  - source count and source energy throughput;
  - construction backlog work;
  - planned worker body WORK parts;
  - current worker WORK-part average when available.
- Keep an aggressive hard clamp for runaway prevention, not as the demand model.
- Do not add fallback/compat behavior for the old fixed target.
- Runtime snapshot may add source/WORK-part fields, but policy must stay in `src/colony/bootstrap-economy.ts`.

## Acceptance criteria

- Current W51N21-like state (`sourceCount=2`, 550-energy body, backlog about 33k, 5 workers) should demand more than 5 workers.
- Zero/small backlog can still demand enough workers to saturate sources when economy is safe.
- Unsafe downgrade or non-RCL2 state returns survival demand.
- Unit tests cover source-driven, backlog-driven, body-driven, and downgrade-gated behavior.
- Focused tests, `pnpm check`, `git diff --check`, and Trellis validation pass.
