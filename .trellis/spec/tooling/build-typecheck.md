# Build and Typecheck

## Build Output

Rollup compiles `src/main.ts` into Screeps-compatible `dist/main.js`.

Current references:

- `rollup.config.mjs`
- `package.json` script `build`
- `test/e2e/compiled-loop.test.ts`

Do not deploy source TypeScript directly to Screeps.

Before deployment, rebuild `dist/main.js` and verify the deployed remote module hash matches the rebuilt local artifact.

## Typecheck

`pnpm typecheck` must cover source, tests, and Node config types through:

- `tsconfig.json`
- `tsconfig.vitest.json`
- `tsconfig.node.json`

Do not silence type errors with broad casts. If an external API boundary returns unknown data, validate it at the edge and convert it into a typed local shape.

## Build Artifacts

`dist/` is generated output and ignored by Git. Tests may read it after `pnpm build`, but source of truth remains `src/`.

Do not hand-edit generated bundle files.

Deployment verification should compare the remote Screeps module against the generated artifact, not against TypeScript source.
