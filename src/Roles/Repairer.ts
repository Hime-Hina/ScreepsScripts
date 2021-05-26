export const GetMemConfigForRepairer = (room: Room): CreepMemory => {
  return {
    role: "repairer",
    working: false,
    destId: GetDestIdForRepairer(room),
  };
};

export function GetDestIdForRepairer(room: Room): Id<Structure> | null {
  for (const destId in room.memory.targetsToRepair) {
    if (room.memory.targetsToRepair[destId].amtAcquired > 0) {
      --room.memory.targetsToRepair[destId].amtAcquired;
      return destId as Id<Structure>;
    }
  }
  return null;
}

export const Repairer = {
  run: (creep: Creep): void => {
    if (creep.memory.working && creep.store[RESOURCE_ENERGY] === 0) {
      creep.memory.working = false;
    } else if (creep.store.getFreeCapacity() === 0) {
      creep.memory.working = true;
    }

    if (creep.memory.working) {
      if (creep.memory.destId) {
        const targetInfo = creep.room.memory.targetsToRepair[creep.memory.destId];
        if (targetInfo && !targetInfo.finished) {
          const targetToRepair = Game.getObjectById(creep.memory.destId);
          if (targetToRepair) {
            if (creep.repair(targetToRepair) === ERR_NOT_IN_RANGE) {
              creep.moveTo(targetToRepair, { visualizePathStyle: { stroke: "#ffffff" } });
            }
            if (targetToRepair.hits === targetToRepair.hitsMax) {
              creep.room.memory.targetsToRepair[creep.memory.destId].finished = true;
            }
          }
        } else {
          if (targetInfo) {
            delete creep.room.memory.targetsToRepair[creep.memory.destId];
          }
          creep.memory.destId = GetDestIdForRepairer(creep.room);
        }
      }
    } else {
      if (creep.room.storage && creep.room.storage.store.energy > 0) {
        if (creep.withdraw(creep.room.storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          creep.moveTo(creep.room.storage, { visualizePathStyle: { stroke: "#ffffff" } });
        }
      } else {
        const container = creep.pos.findClosestByRange(FIND_STRUCTURES, {
          filter: (struct: StructureContainer) => struct.structureType === STRUCTURE_CONTAINER && struct.store.energy > 0
        });
        if (container) {
          if (creep.withdraw(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            creep.moveTo(container, { visualizePathStyle: { stroke: "#ffffff" } });
          }
        }
      }
    }
  }
};
