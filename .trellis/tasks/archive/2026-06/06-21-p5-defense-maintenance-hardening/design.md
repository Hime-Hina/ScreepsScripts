# P5 defense maintenance hardening design

Keep tower policy conservative and avoid rampart/wall construction in this slice. Tighten `RoomDefenseState` so it represents actionable core risk: dangerous hostiles only make the room unsafe when near core structures. Extend core structure typing/runtime capture to include storage so RCL4 storage is protected by the same classification.
