/**
 * 返回Harvester初始的Memory设置
 * @param room: Room
 * @return 返回接口类型为CreepMemory的Object.
 */
export const GetMemConfigForHarvester: IGetMemConfig = (room: Room): CreepMemory => {
  const harvesterMem: CreepMemory = {
    role: "harvester",
    working: false,
  };
  for (const sourceId in room.memory.sources) {
    const sourceMem = room.memory.sources[sourceId];
    if (sourceMem.activePosAmt > 0) {
      for (const containerId in sourceMem.containers) {
        if (sourceMem.containers[containerId].amtAcquired > 0) {
          harvesterMem.containerId = containerId as Id<StructureContainer>;
          --sourceMem.containers[containerId].amtAcquired;
          break;
        }
      }
      --sourceMem.activePosAmt;
      harvesterMem.sourceId = sourceId as Id<Source>;
      break;
    }
  }
  return harvesterMem;
}

export const Harvester = {
  run: (creep: Creep): void => {
    if (creep.store.getUsedCapacity() === 0) {
      creep.memory.working = true;
    } else if (creep.store.getFreeCapacity() === 0) {
      creep.memory.working = false;
    }

    if (creep.memory.working) {
      if (creep.memory.sourceId) {
        const target = Game.getObjectById(creep.memory.sourceId);
        if (target) {
          if (!creep.pos.isNearTo(target)) {
            creep.moveTo(target, { visualizePathStyle: { stroke: "#ffffff" } });
          } else creep.harvest(target);
        }
      }
    } else {
      if (creep.memory.containerId && global.roleCounters.carrier !== 0) {
        const sourceContainer = Game.getObjectById(creep.memory.containerId);
        if (sourceContainer) {
          if (!creep.pos.isEqualTo(sourceContainer)) {
            creep.moveTo(sourceContainer, { visualizePathStyle: { stroke: "#ffffff" } });
          } else {
            creep.transfer(sourceContainer, RESOURCE_ENERGY);
          }
        }
      } else {
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
            filter: struct =>
              struct.structureType === STRUCTURE_EXTENSION
              && struct.store.getFreeCapacity(RESOURCE_ENERGY) > 0
          });
          if (targetsExt.length > 0) {
            if (creep.transfer(targetsExt[0], RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
              creep.moveTo(targetsExt[0], { visualizePathStyle: { stroke: "#ffffff" } });
            }
          }
        }
      }
    }

    if (creep.ticksToLive && creep.ticksToLive < 2) {
      creep.drop(RESOURCE_ENERGY);
      creep.suicide();
    }
  }
};

// export const Harvester: IRolesBehavior = (workingData: IWorkingData): ICreepStates => {
//   return {
//     Start(creep: Creep): boolean {
//       if (typeof creep.memory.working === 'undefined') creep.memory.working = false;
//       const source = Game.getObjectById(workingData.srcId) as Source;
//       if (source) {
//         if (!creep.pos.isNearTo(source.pos)) {
//           creep.moveTo(source, { visualizePathStyle: { stroke: "#ffffff" } });
//           return false;
//         } else {
//           if (!workingData.targetId) {
//             const container = creep.pos.findClosestByRange(FIND_STRUCTURES, {
//               filter: struct => struct.structureType === STRUCTURE_CONTAINER
//             });
//             const spawn = creep.room.find(FIND_STRUCTURES, { filter: struct => struct.structureType === STRUCTURE_SPAWN });
//             if (container) global.CreepConfig.ChangeConfigArgs(creep.memory.configName, { srcId: workingData.srcId, targetId: container.id });
//           }
//           return true;
//         }
//       } else return false;
//     },
//     DoWork(creep: Creep): boolean {
//       const source = Game.getObjectById(workingData.srcId) as Source;
//       if (source) {
//         if (creep.harvest(source) === ERR_NOT_IN_RANGE) creep.moveTo(source, { visualizePathStyle: { stroke: "#ffffff" } });
//         return creep.store.getFreeCapacity() === 0;
//       } else return false;
//     },
//     Update(creep: Creep): boolean {
//       const target = Game.getObjectById(workingData.targetId) as StructureContainer | StructureSpawn | StructureExtension;
//       if (target) {
//         if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
//           creep.moveTo(target, { visualizePathStyle: { stroke: "#ffffff" } });
//           return false;
//         } else return true;
//       } else return false;
//     }
//   };
// }
