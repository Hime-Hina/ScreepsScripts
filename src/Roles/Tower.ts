const GetStructureNeedToBeRepaired = (room: Room): Structure | null => {
  let targetToRepair = null;
  _.forIn(room.memory.targetsToRepair, (v, k): boolean => {
    if (!v.finished) {
      targetToRepair = Game.getObjectById(k as Id<Structure>) as StructureNeedFill
      return false;
    }
    return true;
  });
  return targetToRepair;
}

export const Tower = {
  run: (tower: StructureTower): void => {
    if (tower.store.energy > 0) {
      const hostileCreep = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
      if (hostileCreep) {
        tower.attack(hostileCreep);
      } else if (tower.store.energy > 500) {
        const creepToHeal = tower.pos.findClosestByRange(FIND_MY_CREEPS, { filter: crp => crp.hits < crp.hitsMax });
        if (creepToHeal) {
          tower.heal(creepToHeal);
        } else {
          const targetToRepair: Structure | null = GetStructureNeedToBeRepaired(tower.room);
          if (targetToRepair) {
            tower.repair(targetToRepair);
            if (targetToRepair.hits === targetToRepair.hitsMax) {
              tower.room.memory.targetsToRepair[targetToRepair.id].finished = true;
            }
          }
        }
      }
    }
  }
};
