export const Upgrader = {
  run(creep: Creep): void {
    if (creep.memory.working && creep.store[RESOURCE_ENERGY] === 0) {
      creep.memory.working = false;
      creep.say("🚫I need energy!");
    } else if (creep.store.getFreeCapacity() === 0) {
      creep.memory.working = true;
      creep.say("⚡It's time to upgrade the controller.");
    }

    if (creep.memory.working) {
      if (creep.upgradeController(creep.room.controller!) === ERR_NOT_IN_RANGE) {
        creep.moveTo(creep.room.controller!, { visualizePathStyle: { stroke: "#ffffff" } });
      }
    } else {
      const target = Game.getObjectById(Memory.rooms[creep.room.name].sources[0].id);
      if (creep.harvest(target!) === ERR_NOT_IN_RANGE) {
        creep.moveTo(target!, { visualizePathStyle: { stroke: "#ffffff" } });
      }
    }
  }
};
