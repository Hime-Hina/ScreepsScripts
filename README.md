# Screeps代码文件

本仓库是从 [screeps-typescript-starter](https://github.com/screepers/screeps-typescript-starter/) Fork过来的.

## 更新记录

不久前重新开了个房间, 在 `shard3 E27S46`

### 2021年5月8日

上传了本仓库, 说是Fork, 其实是先Clone了原项目, 然后后改了个名再上传的.
大部分时间在配置本地开发环境, 基本上没什么修改, 现在还只是勉强能维持房间的存在.

### 2021年5月25日

添加大量新东西.

* 添加Constants

  ```ts
  export const ROLES_AMOUNT_PER_ROOM: { [roleName in Roles]: number; };
  export const ROLES_BODIES: RolesBodiesConfig;
  export const priorityStructureNeedToBeFilled: { [name: string]: number };
  export const priorityStructureNeedToBeRepaired: { [name: string]: number };
  export const creepsAmtAcquiredForEachRepairing: { [name: string]: number };
  export const creepsAmtAcquiredForEachFilling: { [name: string]: number };
  ```

* 添加Creep角色: Builder, Carrier, Defender, Repairer

  * Builder: 建筑工人. 不存在`ConstructionSite`时, 承担`Carrier`的部分职责.
  * Carrier: 搬运工. 将`Harvester`收获的存储在`Container`的能量转移到`Spawn`, `Extension`, RCL附近的`Container`和`Storege`.
  当`Spawn`正在生成creep, 更新`room.memory.targetsToFill`.
  * Defender: 守卫, 以`rangeAttack`为主. 驻守在房间内的`Rampart`中, 消灭入侵的敌方.
  * Repairer: 维修工人. 从`room.memory.targetsToRepair`获取需要维修的建筑物, 并且`room.memory.targetsToRepair`会定期(200 ticks)更新.

* 添加Tower控制逻辑

  * 优先级: `attack` -> `heal` -> `repair`

* 添加全局挂载(GlobalAPI.ts), 方便在控制台中调用.

  ```ts
  rolesRun: { [roleName in Roles]: (creep: Creep) => void; };
  roomsInfo: IRoomsInfo | undefined;
  roleCounters: { [roleName in Roles]: number };
  GetStructToRepair: (roomName: string, idx: number) => Structure | null;
  InitRolesMem: (room: Room) => void;
  InitCarriersMem: (room: Room) => void;
  GlobalInit: () => void;
  FindTargetToRepair: (room: Room) => Structure | null;
  ```

* 添加全局初始化(Initialize.ts), 主要初始化房间相应的`Memory`
* 修改Harvester逻辑.

  在有`Carrier`存在的情况下, 自动收获`Source`并将`energy`存放在附近的`Container`;
  不存在`Carrier`则将能量放在`Spawn`或`Extension`.

* 修改Upgrader逻辑.

  检查RCL附近是否有`Container`. 若有(`rclContainer`), 则只从其中取能量; 若无, 则从`Storege`, `Container`或`Spawn`中获取能量.

* 尽量用函数式的方式编码.
