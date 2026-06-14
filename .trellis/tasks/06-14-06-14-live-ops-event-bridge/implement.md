# Implementation Plan

1. Move dry-run bridge logic to `ops-event-bridge-dry-run.mjs` and keep its public functions/tests.
2. Add `screeps-console-websocket.mjs` with SockJS frame decoding, websocket URL generation, auth/subscribe, and console update extraction.
3. Replace `ops-event-bridge.mjs` with bounded live bridge loop and reconnect handling.
4. Update `package.json`, `README.md`, `docs/development.md`, and `docs/operations/event-driven-monitoring.md` for live vs dry-run commands.
5. Add focused tests for dry-run exports, live event processing, token redaction, and reconnect-after-close.
6. Verify with focused vitest, `pnpm check`, `pnpm status:live:screeps`, and `git diff` review.
