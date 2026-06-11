# Credentials

## Local Files

Live Screeps credentials stay outside tracked source.

Current local files:

- `screeps.json`: local credential/config file, ignored by Git.
- `screeps.example.json`: tracked shape example without secrets.
- `screeps.ptr.json`: local PTR credential/config file, ignored by Git.
- `screeps.ptr.example.json`: tracked PTR shape example without secrets.

PTR config is independent from live config. It contains only `branch` and `token`; it must not contain `protocol`, `server`, API base, cookies, or account passwords. PTR commands use the fixed API base `https://screeps.com/ptr/api/`.

Do not commit or print:

- Screeps auth tokens.
- Account passwords.
- Browser cookies.
- Full `screeps.json`.
- API responses that include secret material.

## API Contract

Screeps token usage documented in project docs:

- `X-Token` request header.
- `_token` query parameter.

Prefer `X-Token` for scripts because it keeps tokens out of URLs, logs, and browser history.

Do not use account password fallback. If a token is missing, the operation fails with a non-secret diagnostic.

Browser cookies must not be extracted, saved, or reused as automation credentials.

## Validation

Credential-loading code must:

- Validate at the command boundary.
- Convert raw config into a typed local shape.
- Return actionable errors without including secret values.

Internal deployment code should receive typed credentials and must not re-read files or revalidate raw JSON.

Live and PTR credential readers are separate command-boundary readers. Do not make PTR commands call `readMainScreepsConfig` or derive PTR endpoint paths from the live `server` field.

## Wrong vs Correct

#### Wrong

```text
console.log(screepsConfig)
```

#### Correct

```text
console.log("Screeps config loaded for branch main")
```
