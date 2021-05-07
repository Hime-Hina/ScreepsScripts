export const Harvester = {
  run(creep: Creep): void {
    if (creep.store.getFreeCapacity() > 0) {
      creep.memory.working = true;
    } else {
      creep.memory.working = false;
    }

    if (creep.memory.working) {
      const target = Game.getObjectById(Memory.rooms[creep.room.name].sources[0].id);
      if (creep.harvest(target!) === ERR_NOT_IN_RANGE) {
        creep.moveTo(target!, { visualizePathStyle: { stroke: "#ffffff" } });
      }
    } else {
      if (creep.transfer(Game.spawns.Spawn0, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
        creep.moveTo(Game.spawns.Spawn0, { visualizePathStyle: { stroke: "#ffffff" } });
      }
    }
  }
};
