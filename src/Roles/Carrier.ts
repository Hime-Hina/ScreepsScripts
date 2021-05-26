export const GetDestIdForCarrier = (room: Room): Id<Structure> | null => {
  for (const destId in room.memory.targetsToFill) {
    if (room.memory.targetsToFill[destId].amtAcquired > 0) {
      --room.memory.targetsToFill[destId].amtAcquired;
      return destId as Id<Structure>;
    }
  }
  return null;
}

export const GetMemConfigForCarrier: IGetMemConfig = (room: Room): CreepMemory => {
  return {
    role: "carrier",
    working: false,
    destId: GetDestIdForCarrier(room),
  };
}

export const Carrier = {
  run: (creep: Creep): void => {
    // When `working` is set to true, it's time to transfer energy.
    if (creep.memory.working && creep.store.energy === 0) {
      creep.memory.working = false;
    } else if (creep.store.getFreeCapacity() === 0) {
      creep.memory.working = true;
    }

    if (creep.memory.working) {
      if (creep.memory.destId) {
        const targetInfo = creep.room.memory.targetsToFill[creep.memory.destId];
        if (targetInfo && !targetInfo.finished) {
          const targetToFill = Game.getObjectById(creep.memory.destId) as StructureNeedFill;
          if (targetToFill) {
            const newStore = targetToFill.store as StoreDefinition;
            if (creep.transfer(targetToFill, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
              creep.moveTo(targetToFill, { visualizePathStyle: { stroke: "#ffffff" } });
            }
            if (newStore.getFreeCapacity(RESOURCE_ENERGY) === 0) {
              targetInfo.finished = true;
            }
          }
        } else {
          if (targetInfo) delete creep.room.memory.targetsToFill[creep.memory.destId];
          creep.memory.destId = GetDestIdForCarrier(creep.room);
        }
      }
    } else {
      const container = creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (struct: StructureContainer) =>
          struct.structureType === STRUCTURE_CONTAINER && struct.id !== creep.room.memory.rclContainerId && struct.store.energy > 200
      });
      if (container) {
        if (creep.withdraw(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          creep.moveTo(container, { visualizePathStyle: { stroke: "#ffffff" } });
        }
      } else if (creep.room.storage && creep.room.storage.store.energy > 0) {
        if (creep.withdraw(creep.room.storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          creep.moveTo(creep.room.storage, { visualizePathStyle: { stroke: "#ffffff" } });
        }
      }
    }
  }
};
