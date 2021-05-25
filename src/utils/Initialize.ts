import { creepsAmtAcquiredForEachFilling, creepsAmtAcquiredForEachRepairing, priorityStructureNeedToBeFilled, priorityStructureNeedToBeRepaired } from "Constants";

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

const ReturnSourcesInfo = (room: Room): ISourcesInfo => {
  const retVal: ISourcesInfo = {};
  const roomSources = room.find(FIND_SOURCES);
  for (const source of roomSources) {
    retVal[source.id] = { activePosAmt: ReturnAdjacentMiningPos(source).length };
  }
  return retVal;
}

const FindSentryPos = (room: Room): { [id: string]: boolean } => {
  const ramparts: { [id: string]: boolean } = {};
  room.find(FIND_STRUCTURES, {
    filter: (struct) => struct.structureType === STRUCTURE_RAMPART
  }).forEach((rampart, idx, arr) => {
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

export function Initialize(): void {
  // Store the information of each room's sources.
  for (const roomName in Game.rooms) {
    Memory.rooms[roomName] = {
      sources: {},
      spawns: [],
      flags: [],
      sentries: FindSentryPos(Game.rooms[roomName]),
      towers: ReturnTowersId(Game.rooms[roomName]),
      rclContainerId: null,
      targetsToRepair: FindTargetsToRepair(Game.rooms[roomName]),
      targetsToFill: FindTargetsToFill(Game.rooms[roomName])
    };
    Memory.rooms[roomName].rclContainerId = FindRCLContainer(Game.rooms[roomName])?.id as (Id<StructureContainer> | null);
    Memory.rooms[roomName].sources = ReturnSourcesInfo(Game.rooms[roomName]);
    _.forIn(Game.creeps, (v) => {
      if (v.memory.role) ++global.roleCounters[v.memory.role as Roles];
    });
    global.InitRolesMem(Game.rooms[roomName]);
    console.log(`Room ${roomName} was initialized!`);
  }
}
