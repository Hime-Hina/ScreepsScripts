export const GetMemConfigForBulider: IGetMemConfig = (room: Room): CreepMemory => {
  return {
    role: "builder",
    working: false,
  };
}

export const Builder = {
  run: (creep: Creep): void => {
    if (creep.memory.working && creep.store[RESOURCE_ENERGY] === 0) {
      creep.memory.working = false;
      // creep.say("More ⚡!");
    } else if (creep.store.getFreeCapacity() === 0) {
      creep.memory.working = true;
      // creep.say("🔨Building...");
    }

    if (creep.memory.working) {
      const closestTarget = creep.pos.findClosestByPath(creep.room.find(FIND_MY_CONSTRUCTION_SITES));
      if (!closestTarget) {
        const targetsSpawn: StructureSpawn[] = creep.room.find(FIND_MY_SPAWNS, {
          filter: (spawn: StructureSpawn) =>
            spawn.store.energy < SPAWN_ENERGY_CAPACITY
        });
        if (targetsSpawn.length > 0) {
          if (creep.transfer(targetsSpawn[0], RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            creep.moveTo(targetsSpawn[0], { visualizePathStyle: { stroke: "#ffffff" } });
          }
        } else {
          const targetsExt: Structure[] | StructureExtension[] = creep.room.find(FIND_MY_STRUCTURES, {
            filter: structure =>
              structure.structureType === STRUCTURE_EXTENSION
              && structure.store.energy < structure.store.getCapacity(RESOURCE_ENERGY)
          });
          if (targetsExt.length > 0) {
            if (creep.transfer(targetsExt[0], RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
              creep.moveTo(targetsExt[0], { visualizePathStyle: { stroke: "#ffffff" } });
            }
          } else {
            const rclContainerId = creep.room.memory.rclContainerId;
            if (rclContainerId) {
              const rclContainer = Game.getObjectById(rclContainerId);
              if (rclContainer && creep.transfer(rclContainer, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(rclContainer, { visualizePathStyle: { stroke: "#ffffff" } });
              }
            }
          }
        }
      } else if (creep.build(closestTarget) === ERR_NOT_IN_RANGE) {
        creep.moveTo(closestTarget);
      }
    } else {
      if (creep.room.storage && creep.room.storage.store.energy >= creep.store.getCapacity()) {
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
