export const Upgrader = {
  run: (creep: Creep): void => {
    if (creep.memory.working && creep.store[RESOURCE_ENERGY] === 0) {
      creep.memory.working = false;
    } else if (creep.store.getFreeCapacity() === 0) {
      creep.memory.working = true;
    }

    if (creep.memory.working) {
      if (creep.upgradeController(creep.room.controller!) === ERR_NOT_IN_RANGE) {
        creep.moveTo(creep.room.controller!, { visualizePathStyle: { stroke: "#ffffff" } });
      }
    } else {
      if (creep.room.memory.rclContainerId) {
        const rclContainer = Game.getObjectById(creep.room.memory.rclContainerId);
        if (rclContainer) {
          if (creep.withdraw(rclContainer, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            creep.moveTo(rclContainer, { visualizePathStyle: { stroke: "#ffffff" } });
          }
        }
      } else if (creep.room.storage && creep.room.storage.store.energy > 0) {
        if (creep.withdraw(creep.room.storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          creep.moveTo(creep.room.storage, { visualizePathStyle: { stroke: "#ffffff" } });
        }
      } else {
        const spawnsForEnergy = creep.room.find(FIND_MY_SPAWNS, { filter: spawn => spawn.store.energy > 250 });
        if (spawnsForEnergy.length > 0) {
          if (creep.withdraw(spawnsForEnergy[0], RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            creep.moveTo(spawnsForEnergy[0], { visualizePathStyle: { stroke: "#ffffff" } });
          }
        }
      }
    }
  }
};

// export const Upgrader: IRolesBehavior = (workingData: IWorkingData): ICreepStates => {
//   return {
//     DoWork(creep: Creep): boolean {
//       const controller = creep.room.controller;
//       if (controller && creep.upgradeController(controller) === ERR_NOT_IN_RANGE) {
//         creep.moveTo(controller, { visualizePathStyle: { stroke: "#ffffff" } });
//       }
//       return creep.store.energy === 0;
//     },
//     Start(creep: Creep): boolean {
//       if (creep.store.energy > 0) return true;

//       if (workingData.srcId) {
//         const source = Game.getObjectById(workingData.srcId) as Source;
//         if (source && creep.harvest(source) === ERR_NOT_IN_RANGE) {
//           creep.moveTo(source, { visualizePathStyle: { stroke: "#ffffff" } });
//         }
//       }
//       return creep.store.getFreeCapacity() === 0;
//     }
//   };
// };
