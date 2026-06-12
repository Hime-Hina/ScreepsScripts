# Mature Screeps bot research

## Summary

成熟 bot 的共同方向是：独立 construction planning、独立 energy logistics、按 RCL 分阶段建造、道路和 container 在维护逻辑存在后再扩。当前仓库应采用这些原则，但不能直接引入完整 colony framework。

## Sources

- [Overmind](https://github.com/bencbartlett/Overmind): 公开说明其核心结构是 Overlords 组织 creep action、Colony 聚合 room/structure/creep 等对象，适合作为“分层边界”参考。
- [Overmind docs](https://bencbartlett.com/overmind-docs/): 暴露 RoomPlanner、RoadPlannerMemory、BuildPriorities、task names 等领域概念，说明成熟 bot 会把 build/repair/withdraw/transfer 作为明确任务。
- [Ben Bartlett: Interior Design](https://bencbartlett.com/blog/screeps-2-interior-design/): room planner 先布局 cluster，再用 road path 连接 hatchery、upgrade site、mining site，并周期性放置缺失 construction site。
- [TooAngel README](https://github.com/TooAngel/screeps): 声明支持 automatic base building、smart room layout、room extension/expansion management。
- [TooAngel Design](https://tooangel.github.io/screeps/doc/Design.html): 自动生成 room layout 并按当前 RCL 建造结构。
- [KasamiBot features](https://kasami.github.io/kasamibot/features.html): flexible layout、7x7 core、优先 spawn/extensions、road network 到 sources/outposts、container 作为 storage 前过渡、janitor 负责 road/container repair。
- [Harabi base planning guide](https://sy-harabi.github.io/Automating-base-planning-in-screeps/): distance transform、starting position、core structures、upgrade area、floodfill、infrastructure、min-cut ramparts、tower placement。
- [Screeps API](https://docs.screeps.com/api/): RCL2 extension limit/capacity/cost、construction site 和 build API 约束。

## Adjustments To Initial Plan

- Keep first implementation smaller than mature bot architecture.
- Do extension/refill/build before road/container/repair.
- Treat extension construction as a planner decision, not as worker role logic.
- Replace spawn-only refill with generic energy-structure refill.
- Delay road planner until repair behavior exists.
- Delay containers until withdraw/pickup/hauler behavior exists.
- Delay ramparts/walls until tower/repair budget exists.
