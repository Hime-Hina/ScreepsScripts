export const GetSentryId = (room: Room): Id<StructureRampart> | null => {
  for (const sentryId in room.memory.sentries) {
    if (room.memory.sentries[sentryId]) {
      room.memory.sentries[sentryId] = false;
      return sentryId as Id<StructureRampart>;
    }
  }
  return null;
}

export const GetMemConfigForDefender = (room: Room): CreepMemory => {
  return {
    role: "defender",
    working: false,
    sentryId: GetSentryId(room),
  };
};

const Defend = (creep: Creep): void => {
  const hostileCreep = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
  if (hostileCreep && creep.rangedAttack(hostileCreep) === ERR_NOT_IN_RANGE) {
    creep.moveTo(hostileCreep);
  }
}

export const Defender = {
  run: (creep: Creep): void => {
    if (creep.memory.sentryId) {
      const rampart = Game.getObjectById(creep.memory.sentryId);
      if (rampart) {
        if (!creep.pos.isEqualTo(rampart.pos)) {
          creep.moveTo(rampart);
        } else {
          const hostileCreep = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
          if (hostileCreep) creep.rangedAttack(hostileCreep);
        }
      } else if (!creep.spawning) {
        console.log(`No available sentry for ${creep.name}<${creep.id}>!`);
        Defend(creep);
      }
    }
  }
};
