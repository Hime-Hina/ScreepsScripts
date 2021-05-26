import { creepsAmtAcquiredForEachFilling, creepsAmtAcquiredForEachRepairing, priorityStructureNeedToBeFilled, priorityStructureNeedToBeRepaired } from "Constants";
import { Builder, GetMemConfigForBulider } from "Roles/Builder";
import { Carrier, GetDestIdForCarrier, GetMemConfigForCarrier } from "Roles/Carrier";
import { Defender, GetMemConfigForDefender } from "Roles/Defender";
import { GetMemConfigForHarvester, Harvester } from "Roles/Harvester";
import { Repairer, GetMemConfigForRepairer } from "Roles/Repairer";
import { Upgrader, GetMemConfigForUpgrader } from "Roles/Upgrader";

const dirX = [-1, 1, 0, 0, -1, 1, -1, 1];
const dirY = [0, 0, -1, 1, -1, 1, 1, -1];

const FindRCLContainer = (room: Room): StructureContainer | undefined | null => room.controller?.pos.findClosestByRange(FIND_STRUCTURES, {
  filter: struct => struct.structureType === STRUCTURE_CONTAINER
}) as (StructureContainer | undefined | null);

const ReturnTowersId = (room: Room): Id<StructureTower>[] => {
  const towers = room.find(FIND_STRUCTURES, { filter: struct => struct.structureType === STRUCTURE_TOWER }) as StructureTower[];
  return towers.map(v => v.id);
}

export const FindTargetsToRepair = (room: Room): ITask => {
  const structsToRepair = room.find(FIND_STRUCTURES, {
    filter: struct => (struct.structureType in priorityStructureNeedToBeRepaired) && (struct.hits < struct.hitsMax)
  });
  const ret: ITask = {};
  _.map(
    (structsToRepair).sort(
      (a, b) => {
        const con0 = priorityStructureNeedToBeRepaired[a.structureType] - priorityStructureNeedToBeRepaired[b.structureType];
        if (con0 === 0) {
          return a.hits * b.hitsMax - a.hitsMax * b.hits;
        } else return con0;
      }
    ),
    struct => { return { id: struct.id, amtAcquired: creepsAmtAcquiredForEachRepairing[struct.structureType], finished: false } }
  ).forEach(elem => ret[elem.id] = { amtAcquired: elem.amtAcquired, finished: elem.finished });
  return ret;
}

export const FindTargetsToFill = (room: Room): ITask => {
  const rclContainer = FindRCLContainer(room);
  const structsToFill = room.find(FIND_STRUCTURES, {
    filter: (struct: StructureNeedFill) => {
      if (struct.structureType in priorityStructureNeedToBeFilled) {
        if (struct.structureType === STRUCTURE_CONTAINER && struct.id !== rclContainer?.id) return false;
        const newStore = struct.store as StoreDefinition;
        return newStore.getUsedCapacity(RESOURCE_ENERGY) < newStore.getCapacity(RESOURCE_ENERGY);
      } else return false;
    }
  }) as StructureNeedFill[];
  const ret: ITask = {};

  if (rclContainer) structsToFill.push(rclContainer);
  _.map(
    (structsToFill).sort(
      (a: StructureNeedFill, b: StructureNeedFill) =>
        (priorityStructureNeedToBeFilled[a.structureType] - priorityStructureNeedToBeFilled[b.structureType])
    ),
    struct => { return { id: struct.id, amtAcquired: creepsAmtAcquiredForEachFilling[struct.structureType], finished: false } }
  ).forEach(elem => ret[elem.id] = { amtAcquired: elem.amtAcquired, finished: elem.finished });
  return ret;
}

const ReturnAdjacentMiningPos = (source: Source): MiningPos[] => {
  const ret: MiningPos[] = [];
  let tmpPos: MiningPos;

  for (let i = 0; i < 8; ++i) {
    tmpPos = { x: source.pos.x + dirX[i], y: source.pos.y + dirY[i], isActive: true };
    if (
      (0 <= tmpPos.x && tmpPos.x < 50)
      && (0 <= tmpPos.y && tmpPos.y < 50)
      && (source.room.getTerrain().get(tmpPos.x, tmpPos.y) === 0) // Plain terrain
    ) { ret.push(tmpPos); }
  }
  return ret;
}

const FindSourceContainers = (source: Source): { [id: string]: { amtAcquired: number; } } => {
  const ret: { [id: string]: { amtAcquired: number; } } = {};
  source.pos.findInRange(
    FIND_STRUCTURES, 2,
    {
      filter: str => str.structureType === STRUCTURE_CONTAINER
    }).forEach(con => ret[con.id] = { amtAcquired: 1 });
  return ret;
}

const ReturnSourcesInfo = (room: Room): ISourcesInfo => {
  const retVal: ISourcesInfo = {};
  const roomSources = room.find(FIND_SOURCES);
  for (const source of roomSources) {
    retVal[source.id] = { activePosAmt: 2, containers: FindSourceContainers(source) };
  }
  return retVal;
}

const FindSentryPos = (room: Room): { [id: string]: boolean } => {
  const ramparts: { [id: string]: boolean } = {};
  room.find(FIND_STRUCTURES, {
    filter: (struct) => struct.structureType === STRUCTURE_RAMPART
  }).forEach((rampart) => {
    let isValid = true;
    for (const ramId in ramparts) {
      const storedRam = Game.getObjectById(ramId as Id<StructureRampart>);
      if (storedRam && rampart.pos.inRangeTo(storedRam, 3)) {
        isValid = false;
        break;
      }
    }
    if (isValid) ramparts[rampart.id] = true;
  });
  return ramparts;
}

export const GlobalAPI = (): void => {
  global.GetStructToRepair = (roomName: string, idx: number): Structure | null => {
    return Game.getObjectById(Object.keys(Memory.rooms[roomName].targetsToRepair)[idx] as Id<Structure>);
  };
  global.roleCounters = {
    harvester: 0,
    upgrader: 0,
    builder: 0,
    repairer: 0,
    carrier: 0,
    worker: 0,
    defender: 0,
  };
  global.RolesRun = {
    harvester: Harvester.run,
    upgrader: Upgrader.run,
    builder: Builder.run,
    repairer: Repairer.run,
    carrier: Carrier.run,
    worker: (creep: Creep) => console.log("Worker.run is unimplemented!"),
    defender: Defender.run,
  };
  global.GetRolesMemConfig = {
    harvester: GetMemConfigForHarvester,
    carrier: GetMemConfigForCarrier,
    upgrader: GetMemConfigForUpgrader,
    builder: GetMemConfigForBulider,
    defender: GetMemConfigForDefender,
    repairer: GetMemConfigForRepairer,
    worker: (room: Room) => { console.log("GetRolesMemConfig.worker is unimplemented!"); return {} as CreepMemory }
  };
  global.GlobalInit = Initialize;
  global.InitRolesMem = (room: Room): void => {
    _.map(room.find(FIND_MY_CREEPS), crp => {
      crp.memory = global.GetRolesMemConfig[crp.memory.role as Roles](crp.room);
    });
  };
  global.InitCarriersMem = (room: Room): void => {
    _.map(room.find(FIND_MY_CREEPS, { filter: crp => crp.memory.role === "carrier" }),
      crp => { crp.memory.destId = GetDestIdForCarrier(crp.room); });
  };
  global.CreepConfig = {
    Add(configName: string, specificRole: Roles, args: IWorkingData): boolean {
      if (!Memory.creepConfigs) Memory.creepConfigs = {};
      if (Memory.creepConfigs[configName]) return false;

      Memory.creepConfigs[configName] = { role: specificRole, args };
      return true;
    },
    Get(configName: string): ICreepConfig | undefined {
      if (!Memory.creepConfigs) return undefined;
      return Memory.creepConfigs[configName];
    },
    Remove(configName: string): true {
      delete Memory.creepConfigs[configName];
      return true;
    },
    ChangeConfigArgs(configName: string, newArgs: IWorkingData): boolean {
      if (!Memory.creepConfigs || !Memory.creepConfigs[configName]) return false;
      Memory.creepConfigs[configName].args = newArgs;
      return true;
    }
  };
  global.FindTargetToRepair = (room: Room): Structure | null => {
    const targets = room.find(FIND_STRUCTURES, {
      filter: struct => struct.structureType !== STRUCTURE_WALL && struct.hits < struct.hitsMax
    }).sort((a, b) => a.hits / a.hitsMax - b.hits / b.hitsMax);
    if (targets.length > 0) return Game.getObjectById(targets[0].id as Id<Structure>);
    else return null;
  };
}

export function Initialize(): void {
  GlobalAPI();
  // Store the information of each room's sources.
  for (const roomName in Game.rooms) {
    Memory.rooms[roomName] = {
      sources: ReturnSourcesInfo(Game.rooms[roomName]),
      spawns: [],
      flags: [],
      sentries: FindSentryPos(Game.rooms[roomName]),
      towers: ReturnTowersId(Game.rooms[roomName]),
      rclContainerId: null,
      targetsToRepair: FindTargetsToRepair(Game.rooms[roomName]),
      targetsToFill: FindTargetsToFill(Game.rooms[roomName])
    };
    Memory.rooms[roomName].rclContainerId = FindRCLContainer(Game.rooms[roomName])?.id as (Id<StructureContainer> | null);
    _.forIn(Game.creeps, (v) => {
      if (v.memory.role) ++global.roleCounters[v.memory.role as Roles];
    });
    global.InitRolesMem(Game.rooms[roomName]);
    console.log(`Room ${roomName} was initialized!`);
  }
}
