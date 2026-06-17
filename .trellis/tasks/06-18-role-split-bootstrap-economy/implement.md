# Role-split bootstrap economy implementation plan

1. Add role-specific demand types and body catalogs after `SpawnRequest` can represent multiple request types.
2. Add runtime snapshot fields for source/container energy and worker role counts.
3. Add tests for miner/hauler/builder/upgrader priorities.
4. Migrate universal worker action planning only after role spawn behavior is green.
5. Verify with focused spawning/worker/integration tests and full `pnpm check`.
