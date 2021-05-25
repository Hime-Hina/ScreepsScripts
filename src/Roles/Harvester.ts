/**
 * 返回有空闲开采位的Source的Id.
 * @param creep: Creep
 * @return 当有足够的矿位时返回一个Id, 否则返回null.
 */
export function GetSourceIdForHarvester(room: Room): Id<Source> | null {
  for (const sourceId in room.memory.sources) {
    if (room.memory.sources[sourceId].activePosAmt > 0) {
      --room.memory.sources[sourceId].activePosAmt;
      return sourceId as Id<Source>;
    }
  }
  return null;
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
      const targetContainer = creep.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: (struct: StructureContainer) =>
          struct.structureType === STRUCTURE_CONTAINER && struct.pos.inRangeTo(creep, 2) && struct.store.getFreeCapacity() > 0
      }) as StructureContainer | null;
      if (targetContainer) {
        if (creep.transfer(targetContainer, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          creep.moveTo(targetContainer, { visualizePathStyle: { stroke: "#ffffff" } });
        }
      } else if (global.roleCounters.carrier === 0) {
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
