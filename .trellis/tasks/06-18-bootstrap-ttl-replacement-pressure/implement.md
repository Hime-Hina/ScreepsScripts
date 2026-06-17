# Bootstrap TTL replacement pressure implementation plan

1. Add TTL fields to runtime spawning snapshot and test helpers.
2. Add replacement-count selector in `bootstrap-economy` or `spawning` request layer.
3. Add tests for near-expiry and healthy-at-target cases.
4. Verify with focused spawning/colony tests and full `pnpm check`.
