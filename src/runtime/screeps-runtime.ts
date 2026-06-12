import {
  classifyBootstrapControllerDowngradeState,
  classifyBootstrapWorkerPopulation,
  classifySpawnExtensionEnergyState,
  selectRoomConstructionEligibility,
  type SpawnExtensionEnergySnapshot,
} from '../colony/bootstrap-economy';
import {
  cleanStaleCreepMemory,
  readScreepsMemoryState,
  writeScreepsMemoryState,
  type ScreepsMemoryState,
} from '../memory/screeps-memory';
import type {
  ConstructionDecision,
  ConstructionTerrain,
  ConstructionTerrainSnapshot,
  ConstructionWorldSnapshot,
} from '../construction/construction-planner';
import {
  isWorkerRepairStructureType,
  type WorkerActionDecision,
  type WorkerRepairTargetSnapshot,
  type WorkerWorldSnapshot,
} from '../creeps/worker-decision';
import type { SpawningWorldSnapshot } from '../spawning/spawn-decision';
import type { SpawnDecision } from '../spawning/spawn-decision';

export interface ScreepsTickIO {
  executeConstructionDecisions(constructionDecisions: readonly ConstructionDecision[]): void;
  executeSpawnDecision(spawnDecision: SpawnDecision): void;
  executeWorkerActions(workerDecisions: readonly WorkerActionDecision[]): void;
  readonly gameTime: number;
  readCpuUsed(): number;
  readConstructionWorld(): ConstructionWorldSnapshot;
  readSpawningWorld(): SpawningWorldSnapshot;
  readWorkerWorld(): WorkerWorldSnapshot;
  writeConsoleLine(message: string): void;
}

export interface ScreepsTickRuntime extends ScreepsTickIO {
  cleanStaleCreepMemory(): void;
  readMemoryState(): ScreepsMemoryState;
  writeMemoryState(memoryState: ScreepsMemoryState): void;
}

export const captureScreepsTickRuntime = (): ScreepsTickRuntime => ({
  cleanStaleCreepMemory: () => cleanStaleCreepMemory(Memory, new Set(Object.keys(Game.creeps))),
  executeConstructionDecisions,
  executeSpawnDecision,
  executeWorkerActions,
  gameTime: Game.time,
  readCpuUsed: () => Game.cpu.getUsed(),
  readConstructionWorld: captureConstructionWorld,
  readMemoryState: () => readScreepsMemoryState(Memory),
  readSpawningWorld: captureSpawningWorld,
  readWorkerWorld: captureWorkerWorld,
  writeMemoryState: (memoryState) => writeScreepsMemoryState(Memory, memoryState),
  writeConsoleLine: (message) => console.log(message),
});

const captureSpawningWorld = (): SpawningWorldSnapshot => ({
  bodyPartCosts: {
    carry: BODYPART_COST.carry,
    move: BODYPART_COST.move,
    work: BODYPART_COST.work,
  },
  constructionCosts: {
    extension: CONSTRUCTION_COST[STRUCTURE_EXTENSION],
  },
  controllerStructureLimits: {
    extension: CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION],
  },
  gameTime: Game.time,
  rooms: Object.values(Game.rooms).map((room) => ({
    constructionSites: room.find(FIND_CONSTRUCTION_SITES).map((constructionSite) => ({
      remainingWork: constructionSite.progressTotal - constructionSite.progress,
      structureType: constructionSite.structureType,
    })),
    controllerLevel: room.controller?.level ?? 0,
    energyStructures: captureRoomEnergyStructures(room),
    roomName: room.name,
    structures: room.find(FIND_STRUCTURES).map((structure) => ({
      structureType: structure.structureType,
    })),
    ticksToDowngrade: room.controller?.ticksToDowngrade ?? 0,
    workerCreepCount: Object.values(Game.creeps).filter((creep) => creep.room.name === room.name)
      .length,
  })),
  spawns: Object.values(Game.spawns).map((spawn) => ({
    availableEnergy: spawn.store.getUsedCapacity(RESOURCE_ENERGY),
    energyCapacity: readEnergyCapacity(spawn.store),
    isSpawning: spawn.spawning !== null,
    name: spawn.name,
    roomName: spawn.pos.roomName,
  })),
});

const captureConstructionWorld = (): ConstructionWorldSnapshot => ({
  controllerStructureLimits: {
    extension: CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION],
  },
  ownedRooms: Object.values(Game.rooms).flatMap((room) => {
    if (room.controller?.my !== true) {
      return [];
    }

    const roomSpawn = Object.values(Game.spawns)
      .filter((spawn) => spawn.pos.roomName === room.name)
      .sort((leftSpawn, rightSpawn) => leftSpawn.name.localeCompare(rightSpawn.name))[0];

    if (roomSpawn === undefined) {
      return [];
    }

    return [
      {
        blockedPositions: [
          ...room.find(FIND_SOURCES).map(toPositionSnapshot),
          ...(room.controller === undefined ? [] : [toPositionSnapshot(room.controller)]),
          ...room.find(FIND_MINERALS).map(toPositionSnapshot),
        ],
        constructionSites: room.find(FIND_CONSTRUCTION_SITES).map((constructionSite) => ({
          structureType: constructionSite.structureType,
          ...toPositionSnapshot(constructionSite),
        })),
        controllerLevel: room.controller.level,
        roomName: room.name,
        spawnPosition: toPositionSnapshot(roomSpawn),
        structures: room.find(FIND_STRUCTURES).map((structure) => ({
          structureType: structure.structureType,
          ...toPositionSnapshot(structure),
        })),
        terrain: captureTerrainAroundPosition(room, roomSpawn.pos, 2),
      },
    ];
  }),
});

const captureWorkerWorld = (): WorkerWorldSnapshot => ({
  constructionEligibilities: Object.values(Game.rooms).map((room) => {
    const roomEnergyStructures = captureRoomEnergyStructures(room);
    const roomWorkerCreepCount = countRoomWorkerCreeps(room.name);

    return selectRoomConstructionEligibility({
      controllerDowngradeState: classifyBootstrapControllerDowngradeState({
        roomName: room.name,
        ticksToDowngrade: room.controller?.ticksToDowngrade ?? 0,
      }),
      energyState: classifySpawnExtensionEnergyState({
        energyStructures: roomEnergyStructures,
        roomName: room.name,
      }),
      roomName: room.name,
      workerPopulationState: classifyBootstrapWorkerPopulation({
        roomName: room.name,
        workerCreepCount: roomWorkerCreepCount,
      }),
    });
  }),
  energyPickups: Object.values(Game.rooms).flatMap((room) =>
    room
      .find(FIND_DROPPED_RESOURCES)
      .filter((resource) => resource.resourceType === RESOURCE_ENERGY)
      .map((resource) => ({
        amount: resource.amount,
        id: resource.id,
        roomName: resource.pos.roomName,
      })),
  ),
  energyWithdrawals: Object.values(Game.rooms).flatMap(captureRoomEnergyWithdrawals),
  constructionSites: Object.values(Game.rooms).flatMap((room) =>
    room.find(FIND_MY_CONSTRUCTION_SITES).map((constructionSite) => ({
      id: constructionSite.id,
      roomName: constructionSite.pos.roomName,
    })),
  ),
  controllers: Object.values(Game.rooms).flatMap((room) => {
    const roomController = room.controller;

    if (roomController?.my !== true) {
      return [];
    }

    return [
      {
        id: roomController.id,
        level: roomController.level,
        roomName: room.name,
        ticksToDowngrade: roomController.ticksToDowngrade,
      },
    ];
  }),
  creeps: Object.values(Game.creeps).map((creep) => ({
    energy: creep.store.getUsedCapacity(RESOURCE_ENERGY),
    freeCapacity: creep.store.getFreeCapacity(RESOURCE_ENERGY),
    name: creep.name,
    roomName: creep.room.name,
  })),
  energyStructures: Object.values(Game.rooms).flatMap((room) =>
    room
      .find(FIND_MY_STRUCTURES)
      .filter(isWorkerEnergyStructure)
      .map((energyStructure) => ({
        availableEnergy: energyStructure.store.getUsedCapacity(RESOURCE_ENERGY),
        energyCapacity: readEnergyCapacity(energyStructure.store),
        id: energyStructure.id,
        roomName: energyStructure.pos.roomName,
      })),
  ),
  repairTargets: Object.values(Game.rooms).flatMap(captureRoomRepairTargets),
  sources: Object.values(Game.rooms).flatMap((room) =>
    room.find(FIND_SOURCES).map((source) => ({
      id: source.id,
      roomName: room.name,
    })),
  ),
});

const captureRoomEnergyStructures = (room: Room): readonly SpawnExtensionEnergySnapshot[] =>
  room
    .find(FIND_MY_STRUCTURES)
    .filter(isWorkerEnergyStructure)
    .map((energyStructure) => ({
      availableEnergy: energyStructure.store.getUsedCapacity(RESOURCE_ENERGY),
      energyCapacity: readEnergyCapacity(energyStructure.store),
    }));

const captureRoomRepairTargets = (room: Room): readonly WorkerRepairTargetSnapshot[] => {
  if (room.controller?.my !== true) {
    return [];
  }

  return room.find(FIND_STRUCTURES).flatMap(toWorkerRepairTargetSnapshot);
};

const toWorkerRepairTargetSnapshot = (
  structure: Structure,
): readonly [WorkerRepairTargetSnapshot] | readonly [] => {
  if (!isWorkerRepairStructureType(structure.structureType)) {
    return [];
  }

  return [
    {
      hits: structure.hits,
      hitsMax: structure.hitsMax,
      id: structure.id,
      roomName: structure.pos.roomName,
      structureType: structure.structureType,
      x: structure.pos.x,
      y: structure.pos.y,
    },
  ];
};

const countRoomWorkerCreeps = (roomName: string): number =>
  Object.values(Game.creeps).filter((creep) => creep.room.name === roomName).length;

const captureRoomEnergyWithdrawals = (
  room: Room,
): readonly {
  readonly availableEnergy: number;
  readonly id: string;
  readonly roomName: string;
}[] => [
  ...room.find(FIND_TOMBSTONES).flatMap(toEnergyWithdrawalSnapshot),
  ...room.find(FIND_RUINS).flatMap(toEnergyWithdrawalSnapshot),
  ...room
    .find(FIND_MY_STRUCTURES)
    .filter(isOwnedEnergyWithdrawalStructure)
    .flatMap(toEnergyWithdrawalSnapshot),
];

const toEnergyWithdrawalSnapshot = (
  storeObject: RoomObject & { readonly id: string; readonly store: StoreDefinition },
):
  | readonly [
      {
        readonly availableEnergy: number;
        readonly id: string;
        readonly roomName: string;
      },
    ]
  | readonly [] => {
  const availableEnergy = storeObject.store.getUsedCapacity(RESOURCE_ENERGY);

  if (availableEnergy <= 0) {
    return [];
  }

  return [
    {
      availableEnergy,
      id: storeObject.id,
      roomName: storeObject.pos.roomName,
    },
  ];
};

const isOwnedEnergyWithdrawalStructure = (
  structure: AnyOwnedStructure,
): structure is AnyOwnedStructure & { readonly store: StoreDefinition } =>
  !isWorkerEnergyStructure(structure) && 'store' in structure;

const executeConstructionDecisions = (
  constructionDecisions: readonly ConstructionDecision[],
): void => {
  for (const constructionDecision of constructionDecisions) {
    executeConstructionDecision(constructionDecision);
  }
};

const executeConstructionDecision = (constructionDecision: ConstructionDecision): void => {
  switch (constructionDecision.type) {
    case 'createConstructionSite': {
      const room = Game.rooms[constructionDecision.roomName];

      if (room === undefined) {
        throw new Error(
          `Room "${constructionDecision.roomName}" does not exist for construction decision.`,
        );
      }

      room.createConstructionSite(
        constructionDecision.x,
        constructionDecision.y,
        constructionDecision.structureType,
      );
      return;
    }
  }
};

const executeSpawnDecision = (spawnDecision: SpawnDecision): void => {
  const spawn = Game.spawns[spawnDecision.spawnName];

  if (spawn === undefined) {
    throw new Error(`Spawn "${spawnDecision.spawnName}" does not exist for spawn decision.`);
  }

  spawn.spawnCreep([...spawnDecision.body], spawnDecision.creepName);
};

const executeWorkerActions = (workerDecisions: readonly WorkerActionDecision[]): void => {
  for (const workerDecision of workerDecisions) {
    executeWorkerAction(workerDecision);
  }
};

const executeWorkerAction = (workerDecision: WorkerActionDecision): void => {
  const creep = readOwnedCreep(workerDecision.creepName);

  switch (workerDecision.type) {
    case 'harvestSource': {
      const source = readSource(workerDecision.sourceId);
      const actionReturnCode = creep.harvest(source);

      moveToActionTargetWhenOutOfRange(actionReturnCode, creep, source);
      return;
    }

    case 'pickupEnergy': {
      const droppedEnergy = readDroppedEnergy(workerDecision.resourceId);
      const actionReturnCode = creep.pickup(droppedEnergy);

      moveToActionTargetWhenOutOfRange(actionReturnCode, creep, droppedEnergy);
      return;
    }

    case 'withdrawEnergy': {
      const energyWithdrawalTarget = readEnergyWithdrawalTarget(workerDecision.structureId);
      const actionReturnCode = creep.withdraw(energyWithdrawalTarget, RESOURCE_ENERGY);

      moveToActionTargetWhenOutOfRange(actionReturnCode, creep, energyWithdrawalTarget);
      return;
    }

    case 'refillEnergyStructure': {
      const energyStructure = readEnergyStructure(workerDecision.structureId);
      const actionReturnCode = creep.transfer(energyStructure, RESOURCE_ENERGY);

      moveToActionTargetWhenOutOfRange(actionReturnCode, creep, energyStructure);
      return;
    }

    case 'buildConstructionSite': {
      const constructionSite = readConstructionSite(workerDecision.constructionSiteId);
      const actionReturnCode = creep.build(constructionSite);

      moveToActionTargetWhenOutOfRange(actionReturnCode, creep, constructionSite);
      return;
    }

    case 'repairStructure': {
      const repairStructure = readRepairStructure(workerDecision.structureId);
      const actionReturnCode = creep.repair(repairStructure);

      moveToActionTargetWhenOutOfRange(actionReturnCode, creep, repairStructure);
      return;
    }

    case 'upgradeController': {
      const controller = readController(workerDecision.controllerId);
      const actionReturnCode = creep.upgradeController(controller);

      moveToActionTargetWhenOutOfRange(actionReturnCode, creep, controller);
      return;
    }
  }
};

const readOwnedCreep = (creepName: string): Creep => {
  const creep = Game.creeps[creepName];

  if (creep === undefined) {
    throw new Error(`Creep "${creepName}" does not exist for worker action.`);
  }

  return creep;
};

const readEnergyStructure = (structureId: string): StructureExtension | StructureSpawn => {
  const energyStructure = Game.getObjectById(
    structureId as Id<StructureExtension | StructureSpawn>,
  );

  if (energyStructure === null) {
    throw new Error(`Energy structure "${structureId}" does not exist for worker action.`);
  }

  return energyStructure;
};

const readConstructionSite = (constructionSiteId: string): ConstructionSite => {
  const constructionSite = Game.getObjectById(constructionSiteId as Id<ConstructionSite>);

  if (constructionSite === null) {
    throw new Error(`Construction site "${constructionSiteId}" does not exist for worker action.`);
  }

  return constructionSite;
};

const readRepairStructure = (structureId: string): Structure => {
  const repairStructure = Game.getObjectById(structureId as Id<Structure>);

  if (repairStructure === null) {
    throw new Error(`Repair structure "${structureId}" does not exist for worker action.`);
  }

  return repairStructure;
};

const readSource = (sourceId: string): Source => {
  const source = Game.getObjectById(sourceId as Id<Source>);

  if (source === null) {
    throw new Error(`Screeps source "${sourceId}" does not exist for worker action.`);
  }

  return source;
};

const readDroppedEnergy = (resourceId: string): Resource<RESOURCE_ENERGY> => {
  const resource = Game.getObjectById(resourceId as Id<Resource<RESOURCE_ENERGY>>);

  if (resource === null) {
    throw new Error(`Dropped energy "${resourceId}" does not exist for worker action.`);
  }

  return resource;
};

const readEnergyWithdrawalTarget = (targetId: string): Structure | Tombstone | Ruin => {
  const energyWithdrawalTarget = Game.getObjectById(targetId as Id<Structure | Tombstone | Ruin>);

  if (energyWithdrawalTarget === null) {
    throw new Error(`Energy withdrawal target "${targetId}" does not exist for worker action.`);
  }

  return energyWithdrawalTarget;
};

const readController = (controllerId: string): StructureController => {
  const controller = Game.getObjectById(controllerId as Id<StructureController>);

  if (controller === null) {
    throw new Error(`Screeps controller "${controllerId}" does not exist for worker action.`);
  }

  return controller;
};

const moveToActionTargetWhenOutOfRange = (
  actionReturnCode: number,
  creep: Creep,
  target: RoomObject,
): void => {
  if (actionReturnCode === ERR_NOT_IN_RANGE) {
    creep.moveTo(target);
  }
};

const readEnergyCapacity = (store: StoreDefinition): number => {
  const energyCapacity = store.getCapacity(RESOURCE_ENERGY);

  if (energyCapacity === null) {
    throw new Error('Screeps store did not report energy capacity.');
  }

  return energyCapacity;
};

const isWorkerEnergyStructure = (
  structure: AnyOwnedStructure,
): structure is StructureExtension | StructureSpawn =>
  structure.structureType === STRUCTURE_EXTENSION || structure.structureType === STRUCTURE_SPAWN;

const toPositionSnapshot = (
  roomObject: RoomObject,
): { readonly x: number; readonly y: number } => ({
  x: roomObject.pos.x,
  y: roomObject.pos.y,
});

const captureTerrainAroundPosition = (
  room: Room,
  centerPosition: RoomPosition,
  radius: number,
): readonly ConstructionTerrainSnapshot[] => {
  const roomTerrain = room.getTerrain();
  const terrainSnapshots: ConstructionTerrainSnapshot[] = [];

  for (let y = centerPosition.y - radius; y <= centerPosition.y + radius; y += 1) {
    for (let x = centerPosition.x - radius; x <= centerPosition.x + radius; x += 1) {
      if (x <= 0 || x >= 49 || y <= 0 || y >= 49) {
        continue;
      }

      terrainSnapshots.push({
        terrain: decodeTerrain(roomTerrain.get(x, y)),
        x,
        y,
      });
    }
  }

  return terrainSnapshots;
};

const decodeTerrain = (terrainMask: number): ConstructionTerrain => {
  if (terrainMask === 1) {
    return 'wall';
  }

  if (terrainMask === 2) {
    return 'swamp';
  }

  return 'plain';
};
