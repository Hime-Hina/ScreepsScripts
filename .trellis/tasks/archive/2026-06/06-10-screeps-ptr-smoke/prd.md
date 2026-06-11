# 接入 Screeps 官方 PTR 冒烟验证

## Goal

为官方在线 PTR 增加显式部署/验证边界和冒烟验证流程，用于发布前预发布兼容性检查，并确保它不会进入默认本地门禁或误操作 live 主服。

## Requirements

- PTR 操作必须使用独立命令，不通过 flag、mode 或 options bag 复用 live 部署命令。
- PTR API base 必须明确指向 `https://screeps.com/ptr/api/`，不能由 live `server` 字段拼接推断。
- PTR 凭据和配置必须独立于 live 主服配置，且不能打印 token、cookie 或完整本地配置。
- PTR smoke 必须默认不进入 `pnpm check`。
- PTR 文档必须说明每周一 `00:00 UTC` reset、脚本清空、CPU subscription 需激活、PTR 行为不等同 live 生产验证。
- PTR 验证至少应区分 API readback 与自然 tick 证据。
- 本任务不接入本地 `screeps@ptr` 常规矩阵。

## Confirmed Facts

- 当前 live 配置入口是 `screeps.json` 的 `main` profile；`scripts/screeps/config.mjs` 从 `protocol` + `server` 拼接 live API host。
- 当前 live API URL 构造使用 `/api/user/code` 绝对路径；该实现不能直接承载 `https://screeps.com/ptr/api/` 这种带 path prefix 的 PTR base。
- 当前 live 命令为 `deploy:screeps`、`verify:live:screeps`、`rollback:screeps`、`scout:screeps`，默认 `pnpm check` 不包含 live、PTR 或本地 official server e2e。
- 当前部署 readback 只证明远端 module 与本地 `dist/main.js` 一致；自然 tick 需要单独证据。
- `.gitignore` 已忽略 `screeps.json` 和 `.screeps/`，尚未记录独立 PTR 凭据文件名。
- 官方文档确认 PTR 是独立 server，世界数据、脚本、Memory、settings 与主服分离；主服数据每周一 `00:00 UTC` 复制到 PTR，并擦除旧 PTR 数据和玩家脚本；PTR CPU subscription 默认停用，需要在 PTR order page 激活到下一次 reset。
- 官方文档确认 auth token 可通过 `X-Token` header 使用；项目规范要求脚本优先使用 header，不能打印 token、cookie 或完整本地配置。

## Acceptance Criteria

- [x] `package.json` 暴露显式 PTR 命令，例如 `deploy:ptr:screeps` / `verify:ptr:screeps`，且不在 `pnpm check` 中。
- [x] PTR 配置加载和 live 配置加载边界清晰，不允许 PTR 命令意外命中 live API base。
- [x] PTR readback 能验证远端 `main` module 与本地 `dist/main.js` 一致。
- [x] PTR 自然 tick 验证路径明确；如果环境阻塞，记录阻塞原因而不是把 readback 当成 tick 验证。
- [x] 文档说明 PTR reset、CPU subscription、用途和风险。
- [x] 没有 token、cookie、完整 `screeps.json` 或 PTR credential 文件进入 Git 或日志。
- [x] `deploy:ptr:screeps` 在覆盖前保存 PTR 远端 module set 到 Git 忽略路径。
- [x] `rollback:ptr:screeps` 使用 PTR snapshot 恢复上一份 PTR module set，并通过 PTR API readback 校验。

## Out of Scope

- 不把 PTR 命令加入默认 `pnpm check`。
- 不实现本地 `screeps@ptr`。
- 不改变 live 主服部署/回滚语义。
- 不把 PTR 结果当作 live 生产验证。
- 不通过 browser cookie、账号密码或 `_token` query parameter 访问 PTR。

## Behavior Slices

- Given the project script contract is inspected, when PTR commands are added, then they are explicit PTR command names and remain outside `pnpm check`.
- Given PTR credentials are needed, when a PTR command starts, then it reads an independent PTR config file and validates only branch/token at the command boundary.
- Given PTR API URLs are constructed, when readback or upload runs, then every request targets `https://screeps.com/ptr/api/` and cannot resolve to live `/api/*`.
- Given the local bundle has been built, when `verify:ptr:screeps` runs, then it compares PTR remote `main` with local `dist/main.js` and reports API readback separately from natural tick evidence.
- Given PTR code has been deployed, when `rollback:ptr:screeps` runs, then it restores the saved PTR snapshot and verifies the restored PTR module set by readback.
- Given PTR reset or CPU subscription blocks execution, when the operator records verification, then the result is recorded as blocked rather than treated as successful natural tick verification.

## Open Questions

- None.

## Notes

- 该任务应在本地 standalone server e2e PoC 任务之后实施，避免同时改变本地测试和在线 PTR 操作边界。
