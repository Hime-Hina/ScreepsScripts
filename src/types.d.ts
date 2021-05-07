// Memory extension

/**
 * The interface of Creep.memory
 */
interface CreepMemory {
  role: string;
  room?: string;
  working?: boolean;
}

/**
 * The interface of Room.memory
 */
interface RoomMemory {
  myCreeps: { [name: string]: { name: string; role: string } };
  hostileCreeps: Creep[];
  sources: SourceInfo[];
  spawns: StructureSpawn[];
  flags: Flag[];
}

/**
 * The interface of Memory
 */
interface Memory {
  uuid: number;
  log: any;
}
// Memory extension

interface CreepsInfo {
  [rolesName: string]: Creep[] | undefined;
  harvesters: Creep[];
  upgraders: Creep[];
  builder: Creep[];
  hostileCreeps?: Creep[];
}

interface SourceInfo {
  id: Id<Source>;
  miningPos: MiningPos[];
}

interface MiningPos {
  x: number;
  y: number;
  isActive: boolean;
}

interface RoomInfo {
  creepsInfo: CreepsInfo;
  sources: Source[];
  spawns: StructureSpawn[];
  flags: Flag[];
}

interface RoomsInfo {
  [roomName: string]: RoomInfo;
}

// `global` extension samples
declare namespace NodeJS {
  interface Global {
    log: any;
    roomsInfo: RoomsInfo | undefined;
  }
}
