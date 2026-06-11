# 参考资料

## 本地官方文档

克隆目标：

```powershell
git clone https://github.com/screeps/docs.git references/screeps-docs
```

该克隆被 Git 忽略，只用于本地搜索。

## 值得研究的仓库

- `screepers/screeps-typescript-starter`：TypeScript + Rollup starter 模式。
- `TooAngel/screeps`：成熟自动化 bot，可参考功能覆盖和运维思路。
- `bencbartlett/Overmind`：成熟 AI 架构，可参考 colony 级概念。
- `The-International-Screeps-Bot/The-International-Open-Source`：TypeScript 自动化 bot，可参考当前开源结构。
- `screeps/screeps`：官方 standalone server 仓库；本地 server e2e 使用 npm 包 `screeps@4.3.0`。
- `screepers/screeps-server-mockup`：社区 server harness 思路参考，不直接作为当前依赖。
- `screepers/screeps-server-test`：社区 server 测试流程参考，不复制代码。
- `screepers/node-screeps-api`：未来可能用于部署/同步 API。

参考代码用于学习术语、边界和测试策略。不要在本地房间约束明确前整体复制成熟 bot 架构。
