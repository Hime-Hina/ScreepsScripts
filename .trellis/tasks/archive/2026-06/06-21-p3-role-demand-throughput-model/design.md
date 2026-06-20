# P3 role demand throughput model design

## Design

Keep the existing single-spawn request shape and priorities, but improve role target selection inside `selectRoleSplitRequest`. Add optional room energy-buffer metrics captured at the runtime boundary so pure spawn logic can reason about source-container backlog and controller/storage buffer without reading globals.

Use bounded formulas, not an empire scheduler:

- miners: `min(sourceCount, sourceContainerCount)`;
- haulers: base 1 when the role split is active, plus one when source containers have significant backlog and core/controller/storage sinks are not saturated;
- builders: 0 with no backlog, otherwise 1-2 from remaining build work;
- upgraders: at least 1 when source containers exist, higher only for downgrade urgency or surplus buffer.

Role counts ignore creeps below the replacement TTL threshold so replacement can start before death.
