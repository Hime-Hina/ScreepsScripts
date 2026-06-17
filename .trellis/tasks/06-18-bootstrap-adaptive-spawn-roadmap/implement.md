# Bootstrap adaptive spawn roadmap implementation plan

## Order

1. Implement `06-18-adaptive-bootstrap-worker-demand` now.
2. Leave `06-18-priority-bootstrap-spawn-requests` planned until the first slice is verified.
3. Implement TTL replacement only after request target-gap accounting exists.
4. Implement role split only after request model and replacement pressure are stable.

## Shared verification gate

For each child task:

```bash
pnpm vitest run test/unit/colony/bootstrap-economy.test.ts test/unit/spawning/spawn-decision.test.ts test/integration/main-loop.test.ts
pnpm check
git diff --check
python3 ./.trellis/scripts/task.py validate <task>
```

## Review gate

Use Bob local Codex CLI plus Hermes subagent only after the implementation slice is green. Children must not deploy unless explicitly authorized.
