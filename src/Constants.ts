const CountBodiesCost = (bodies: BodyPartConstant[]): number => _.sum(_.map(bodies, body => BODYPART_COST[body]));

export const ROLES_AMOUNT_PER_ROOM: {
  [roleName in Roles]: number;
} = {
  harvester: 4,
  carrier: 4,
  upgrader: 2,
  builder: 1,
  repairer: 2,
  worker: 0,
  defender: 3,
};

const ROLES_BODIES: RolesBodiesConfig = {
  harvester: { bodies: [WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE], cost: 0 },
  upgrader: { bodies: [WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE], cost: 0 },
  carrier: { bodies: [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE], cost: 0 },
  builder: { bodies: [WORK, CARRY, CARRY, MOVE, MOVE, MOVE], cost: 0 },
  repairer: { bodies: [WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE], cost: 0 },
  worker: { bodies: [], cost: 0 },
  defender: { bodies: [TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK], cost: 0 },
};
for (const name in ROLES_BODIES) {
  ROLES_BODIES[name as Roles].cost = CountBodiesCost(ROLES_BODIES[name as Roles].bodies);
}
export { ROLES_BODIES };

export const priorityStructureNeedToBeFilled: { [name: string]: number } = {
  [STRUCTURE_SPAWN]: 0,
  [STRUCTURE_EXTENSION]: 1,
  [STRUCTURE_CONTAINER]: 3,
  [STRUCTURE_TOWER]: 2,
  [STRUCTURE_STORAGE]: 4
};
export const priorityStructureNeedToBeRepaired: { [name: string]: number } = {
  [STRUCTURE_SPAWN]: 0,
  [STRUCTURE_EXTENSION]: 0,
  [STRUCTURE_TOWER]: 1,
  [STRUCTURE_CONTAINER]: 2,
  [STRUCTURE_ROAD]: 3,
  [STRUCTURE_STORAGE]: 4,
  [STRUCTURE_RAMPART]: 5,
  [STRUCTURE_WALL]: 6,
};

export const creepsAmtAcquiredForEachRepairing: { [name: string]: number } = {
  [STRUCTURE_SPAWN]: ROLES_AMOUNT_PER_ROOM.repairer,
  [STRUCTURE_EXTENSION]: ROLES_AMOUNT_PER_ROOM.repairer,
  [STRUCTURE_TOWER]: 1,
  [STRUCTURE_CONTAINER]: 1,
  [STRUCTURE_STORAGE]: 1,
  [STRUCTURE_ROAD]: 1,
  [STRUCTURE_RAMPART]: ROLES_AMOUNT_PER_ROOM.repairer,
  [STRUCTURE_WALL]: 0,
};
export const creepsAmtAcquiredForEachFilling: { [name: string]: number } = {
  [STRUCTURE_SPAWN]: 2,
  [STRUCTURE_EXTENSION]: 1,
  [STRUCTURE_CONTAINER]: 1,
  [STRUCTURE_TOWER]: 1,
  [STRUCTURE_STORAGE]: ROLES_AMOUNT_PER_ROOM.carrier
}
