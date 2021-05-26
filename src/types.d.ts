type StructureNeedFill = StructureSpawn | StructureExtension | StructureStorage | StructureContainer | StructureTower;
type Roles = "harvester" | "upgrader" | "builder" | "repairer" | "worker" | "defender" | "carrier";
type RolesBodiesConfig = { [name in Roles]: { bodies: BodyPartConstant[]; cost: number } };
// Memory extension

/**
 * The interface of Creep.memory
 */
interface CreepMemory {
  role: string;
  room?: string;
  working?: boolean;
  sourceId?: Id<Source> | null;
  containerId?: Id<StructureContainer> | null;
  destId?: Id<Structure> | null;
  sentryId?: Id<StructureRampart> | null;
  configName?: string;
}

/**
 * The interface of Room.memory
 */
interface RoomMemory {
  sources: ISourcesInfo;
  spawns: StructureSpawn[];
  flags: Flag[];
  towers: Id<StructureTower>[];
  sentries: { [id: string]: boolean };
  rclContainerId: Id<StructureContainer> | null;
  targetsToRepair: { [id: string]: { amtAcquired: number; finished: boolean }; };
  targetsToFill: { [id: string]: { amtAcquired: number; finished: boolean; } };
}

/**
 * The interface of Memory
 */
interface Memory {
  uuid: number;
  log: any;
  creepConfigs: { [configName: string]: ICreepConfig };
}
// Memory extension

interface IWorkingData {
  srcId: Id<RoomObject>;
  targetId: Id<RoomObject>;
}

interface ICreepConfig {
  role: Roles;
  args: IWorkingData;
}

interface ICreepStates {
  /**
   * [optional] 准备阶段
   */
  Start?: (creep: Creep) => boolean;
  /**
   * [required] 执行主要工作
   */
  DoWork: (creep: Creep) => boolean;
  /**
   * [optional] 进行资源获取, 处理获得的资源.
   */
  Update?: (creep: Creep) => boolean;
}

interface IRolesBehavior {
  (workingData: IWorkingData): ICreepStates;
}

interface CreepsInfo {
  [rolesName: string]: Creep[] | undefined;
  harvesters: Creep[];
  upgraders: Creep[];
  builders: Creep[];
  hostileCreeps?: Creep[];
}

interface ISourcesInfo {
  [id: string]: { activePosAmt: number; containers: { [id: string]: { amtAcquired: number; } } };
  // miningPos: MiningPos[];
}

interface MiningPos {
  x: number;
  y: number;
  isActive: boolean;
}

interface IRoomInfo {
  creepsInfo: CreepsInfo;
  sources: Source[];
  spawns: StructureSpawn[];
  extensions: StructureExtension[] | Structure[];
  flags: Flag[];
}

interface IRoomsInfo {
  [roomName: string]: IRoomInfo;
}

interface ITask {
  [id: string]: { amtAcquired: number; finished: boolean };
}

interface Creep {
  Run(): void;
}

// `global` extension samples
declare namespace NodeJS {
  interface Global {
    log: any;
    RolesRun: { [roleName in Roles]: (creep: Creep) => void; };
    GetRolesMemConfig: { [roleName in Roles]: (room: Room) => CreepMemory };
    roomsInfo: IRoomsInfo | undefined;
    roleCounters: { [roleName in Roles]: number };
    GetStructToRepair: (roomName: string, idx: number) => Structure | null;
    InitRolesMem: (room: Room) => void;
    InitCarriersMem: (room: Room) => void;
    GlobalInit: () => void;
    FindTargetToRepair: (room: Room) => Structure | null;
    CreepConfig: {
      Add: (configName: string, specificRole: Roles, ...args: any[]) => boolean;
      Get: (configName: string) => ICreepConfig | undefined;
      Remove: (configName: string) => true;
      ChangeConfigArgs: (configName: string, newArgs: IWorkingData) => boolean;
    };
  }
}
