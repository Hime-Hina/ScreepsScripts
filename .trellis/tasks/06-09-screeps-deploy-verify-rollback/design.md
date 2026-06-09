# 补部署验证回滚脚本 Design

## Boundaries

- `package.json` 只暴露三个 live 操作入口，不使用 mode/flag/options 参数切换部署、验证、回滚语义。
- `scripts/screeps/` 拥有 Node 侧 Screeps API、配置、hash、snapshot 和命令入口。
- `screeps.json` 是唯一 live credential 输入；脚本只读取本地文件，不打印 secret。
- rollback snapshot 是远端 module set 的恢复凭据，不依赖当前 Git commit 或重新构建当前源码。

## Proposed Local Shape

- `scripts/screeps/deploy.mjs`
- `scripts/screeps/verify-live.mjs`
- `scripts/screeps/rollback.mjs`
- `scripts/screeps/config.mjs`
- `scripts/screeps/screeps-api.mjs`
- `scripts/screeps/module-set.mjs`
- `scripts/screeps/rollback-snapshot.mjs`

Generic names such as `utils`, `helper`, `manager`, or `handler` are not used.

## Data Flow

```text
screeps.json -> typed config -> Screeps API boundary -> remote module set
dist/main.js -> local module set -> upload/readback -> hash comparison
remote module set -> rollback snapshot -> restore/readback -> hash comparison
```

## Contracts

- Config validation happens once in `config.mjs`; command entrypoints receive typed config.
- API fetch code owns HTTP status and Screeps `ok` response handling.
- Module-set code owns SHA-256 calculation and deterministic comparison.
- Snapshot code owns file path, JSON shape, branch binding, and timestamp.
- Deploy blocks when no snapshot can be written.
- Rollback blocks when snapshot branch differs from configured branch.

## Documentation Impact

- `docs/development.md` gains live operation command descriptions.
- `docs/game-state.md` records that rollback path is scripted and whether live upload/rollback was executed or not.
- `screeps.example.json` remains secret-free and documents required fields only.
