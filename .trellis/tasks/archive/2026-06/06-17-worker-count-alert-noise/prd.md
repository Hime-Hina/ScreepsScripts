# Reduce worker count alert noise

## Goal

Reduce false-positive `worker_count_low` critical notifications when a healthy room briefly dips from the survival floor during normal worker replacement.

## Requirements

- Preserve critical alerts for true survival risk, especially rooms with zero workers.
- Preserve critical alerts when worker count is low and recovery is blocked by spawn unavailability or controller downgrade risk.
- Avoid `critical` + `emailFallback` for the observed healthy case: `workers=2`, survival floor `3`, spawn available, controller downgrade timer healthy, no hostile context.
- Keep the change in the runtime alert-selection layer; do not change worker spawning behavior or live operations.

## Acceptance Criteria

- [ ] Unit tests cover the healthy transient `workers=2/3` case and expect no active worker-count notification.
- [ ] Unit tests still cover true critical worker-loss cases.
- [ ] Focused tests pass.
- [ ] `pnpm check` passes.

## Notes

- Current production symptom: repeated `worker_count_low` critical events at natural worker replacement ticks, while live status immediately returns to healthy.
