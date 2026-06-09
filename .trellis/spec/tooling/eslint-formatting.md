# ESLint and Formatting

## Official ESLint Baseline

As of 2026-06-09, the ESLint documentation says ESLint can use `eslint.config.js` as an automatically discovered configuration file, and the migration guide states flat config has been the default since ESLint v9.0.0.

Project rules:

- Keep ESLint in flat config form.
- Keep config in `eslint.config.mjs` unless a tool requirement justifies a different flat config filename.
- Do not use `eslintConfig` in `package.json`; ESLint flat config requires a separate config file.
- Use arrays for `files` patterns.
- Import plugins, parsers, and shared configs as JavaScript objects.

References:

- https://eslint.org/docs/latest/use/configure/
- https://eslint.org/docs/latest/use/configure/migration-guide

## Local Config Shape

Current reference:

- `eslint.config.mjs` uses `typescript-eslint` typed configs, `@eslint/js`, `globals`, and `eslint-config-prettier`.

Keep `eslint-config-prettier` last so lint rules do not fight Prettier formatting.

## vemoji Reference Boundary

`H:\WorkingSpace\vemoji` may be used as a reference for concrete formatting style and flat config examples, but this project must not inherit unrelated vemoji choices.

Do not import vemoji-specific assumptions such as:

- SolidJS rules.
- Browser globals for runtime Screeps code.
- JSON linting unless this project adopts JSON config files as a maintained surface.
- Prettier-as-ESLint integration.

ADR 0002 explicitly keeps Prettier as a separate formatter instead of running it through ESLint.

## Prettier

Current reference:

- `prettier.config.mjs`
- `.prettierignore`
- `pnpm format`
- `pnpm format:fix`

Formatting changes should be mechanical and isolated from behavior changes when practical.
