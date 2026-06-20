# RCL4 storage and extension planning PRD

## Goal

Prepare construction planning for RCL4 so the room automatically builds storage and expands extensions without recreating inaccessible refill-target layouts.

## Requirements

- Add `storage` support to construction planning only when controller level and limits allow it.
- Select a storage site near the core/controller that preserves refill and movement access.
- Preserve cumulative access guard for RCL4 extension expansion.
- Keep site volume staged; no broad road/base fanout in this task.

## Acceptance criteria

- RCL3 does not plan storage.
- RCL4 with no storage/storage site plans one accessible storage site.
- RCL4 extension expansion does not seal spawn/extension/tower/storage access.
- Existing tower/container/road planning tests remain green.
- Full verification/deploy gates pass before live rollout.
