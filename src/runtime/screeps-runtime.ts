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
  type WorkerEnergyMode,
  type WorkerRepairTargetSnapshot,
  type WorkerWorldSnapshot,
} from '../creeps/worker-decision';
import type {
  DefenseCoreStructureSnapshot,
  DefenseDecision,
  DefenseWorldSnapshot,
  RoomDefenseState,
} from '../defense/defense-planner';
import type { SpawningWorldSnapshot } from '../spawning/spawn-decision';
import type { SpawnDecision } from '../spawning/spawn-decision';
import { formatRuntimeOpsEventLine, type RuntimeOpsEvent } from './ops-event';

export interface RuntimeCpuSnapshot {
  readonly bucket: number;
  readonly limit: number;
  readonly tickLimit: number;
  readonly usedAtTickStart: number;
}

export interface RuntimeAlertDecision {
  readonly emailFallback: boolean;
  readonly groupInterval: number;
  readonly message: string;
  readonly opsEvent: RuntimeOpsEvent;
  readonly type: 'notify';
}

export interface ScreepsTickIO {
  executeConstructionDecisions(constructionDecisions: readonly ConstructionDecision[]): void;
  executeDefenseDecisions(defenseDecisions: readonly DefenseDecision[]): void;
  executeSpawnDecision(spawnDecision: SpawnDecision): void;
  executeWorkerActions(workerDecisions: readonly WorkerActionDecision[]): void;
  readonly gameTime: number;
  readonly shardName: string;
  readCpuSnapshot(): RuntimeCpuSnapshot;
  readConstructionWorld(): ConstructionWorldSnapshot;
  readDefenseWorld(): DefenseWorldSnapshot;
  readSpawningWorld(): SpawningWorldSnapshot;
  readSurvivalSpawningWorld(): SpawningWorldSnapshot;
  readSurvivalWorkerWorld(roomDefenseStates: readonly RoomDefenseState[]): WorkerWorldSnapshot;
  readWorkerWorld(roomDefenseStates: readonly RoomDefenseState[]): WorkerWorldSnapshot;
  sendRuntimeAlert(alertDecision: RuntimeAlertDecision): void;
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
  executeDefenseDecisions,
  executeSpawnDecision,
  executeWorkerActions,
  gameTime: Game.time,
  readCpuSnapshot: captureRuntimeCpuSnapshot,
  readConstructionWorld: captureConstructionWorld,
  readDefenseWorld: captureDefenseWorld,
  readMemoryState: () => readScreepsMemoryState(Memory),
  readSpawningWorld: captureSpawningWorld,
  readSurvivalSpawningWorld: captureSurvivalSpawningWorld,
  readSurvivalWorkerWorld: captureSurvivalWorkerWorld,
  readWorkerWorld: captureWorkerWorld,
  sendRuntimeAlert: (alertDecision) =>
    Game.notify(formatRuntimeOpsEventLine(alertDecision.opsEvent), alertDecision.groupInterval),
  shardName: Game.shard?.name ?? 'shard0',
  writeMemoryState: (memoryState) => writeScreepsMemoryState(Memory, memoryState),
  writeConsoleLine: (message) => console.log(message),
});

const captureRuntimeCpuSnapshot = (): RuntimeCpuSnapshot => ({
  bucket: Game.cpu.bucket,
  limit: Game.cpu.limit,
  tickLimit: Game.cpu.tickLimit,
  usedAtTickStart: Game.cpu.getUsed(),
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
    energyCapacity: SPAWN_ENERGY_CAPACITY,
    isSpawning: spawn.spawning !== null,
    name: spawn.name,
    roomName: spawn.pos.roomName,
  })),
});

const captureSurvivalSpawningWorld = (): SpawningWorldSnapshot => ({
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
    constructionSites: [],
    controllerLevel: room.controller?.level ?? 0,
    energyStructures: captureRoomEnergyStructures(room),
    roomName: room.name,
    structures: [],
    ticksToDowngrade: room.controller?.ticksToDowngrade ?? 0,
    workerCreepCount: countRoomWorkerCreeps(room.name),
  })),
  spawns: Object.values(Game.spawns).map((spawn) => ({
    availableEnergy: spawn.store.getUsedCapacity(RESOURCE_ENERGY),
    energyCapacity: SPAWN_ENERGY_CAPACITY,
    isSpawning: spawn.spawning !== null,
    name: spawn.name,
    roomName: spawn.pos.roomName,
  })),
});

const captureConstructionWorld = (): ConstructionWorldSnapshot => ({
  controllerStructureLimits: {
    extension: CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION],
    tower: CONTROLLER_STRUCTURES[STRUCTURE_TOWER],
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
        controllerPosition: toPositionSnapshot(room.controller),
        roomName: room.name,
        sources: room.find(FIND_SOURCES).map((source) => ({
          id: source.id,
          ...toPositionSnapshot(source),
        })),
        spawnPosition: toPositionSnapshot(roomSpawn),
        structures: room.find(FIND_STRUCTURES).map((structure) => ({
          structureType: structure.structureType,
          ...toPositionSnapshot(structure),
        })),
        terrain: captureRoomInteriorTerrain(room),
      },
    ];
  }),
});

const captureDefenseWorld = (): DefenseWorldSnapshot => {
  const visibleRooms = Object.values(Game.rooms);
  const ownedRooms = visibleRooms.filter((room) => room.controller?.my === true);

  return {
    bodyPartConstants: {
      attack: ATTACK,
      heal: HEAL,
      move: MOVE,
      rangedAttack: RANGED_ATTACK,
      work: WORK,
    },
    bodyPartPowers: {
      attack: ATTACK_POWER,
      dismantle: DISMANTLE_POWER,
      heal: HEAL_POWER,
      rangedAttack: RANGED_ATTACK_POWER,
    },
    controllers: ownedRooms.flatMap((room) => {
      const roomController = room.controller;

      if (roomController === undefined) {
        return [];
      }

      return [
        {
          id: roomController.id,
          roomName: room.name,
          safeModeAvailable: roomController.safeModeAvailable,
          ...(roomController.safeMode === undefined ? {} : { safeMode: roomController.safeMode }),
          ...(roomController.safeModeCooldown === undefined
            ? {}
            : { safeModeCooldown: roomController.safeModeCooldown }),
          upgradeBlocked: roomController.upgradeBlocked,
        },
      ];
    }),
    coreStructures: ownedRooms.flatMap((room) =>
      room.find(FIND_MY_STRUCTURES).flatMap(toDefenseCoreStructureSnapshot),
    ),
    hostileCreeps: ownedRooms.flatMap((room) =>
      room.find(FIND_HOSTILE_CREEPS).map((hostileCreep) => ({
        bodyParts: hostileCreep.body.map((bodyPart) => ({
          hits: bodyPart.hits,
          type: bodyPart.type,
        })),
        hits: hostileCreep.hits,
        id: hostileCreep.id,
        owner: hostileCreep.owner.username,
        roomName: hostileCreep.pos.roomName,
        x: hostileCreep.pos.x,
        y: hostileCreep.pos.y,
      })),
    ),
    roomNames: visibleRooms.map((room) => room.name),
  };
};

const captureWorkerWorld = (
  roomDefenseStates: readonly RoomDefenseState[],
): WorkerWorldSnapshot => ({
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
      roomDefenseState: readRoomDefenseState(roomDefenseStates, room.name),
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
      progress: constructionSite.progress,
      progressTotal: constructionSite.progressTotal,
      roomName: constructionSite.pos.roomName,
      structureType: constructionSite.structureType,
      x: constructionSite.pos.x,
      y: constructionSite.pos.y,
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
  creeps: Object.values(Game.creeps).map(captureWorkerCreepSnapshot),
  energyStructures: Object.values(Game.rooms).flatMap((room) =>
    room
      .find(FIND_MY_STRUCTURES)
      .filter(isWorkerEnergyStructure)
      .map((energyStructure) => ({
        availableEnergy: energyStructure.store.getUsedCapacity(RESOURCE_ENERGY),
        energyCapacity: readSpawnExtensionEnergyCapacity(energyStructure, room),
        id: energyStructure.id,
        roomName: energyStructure.pos.roomName,
      })),
  ),
  repairTargets: Object.values(Game.rooms).flatMap(captureRoomRepairTargets),
  sources: Object.values(Game.rooms).flatMap((room) =>
    room.find(FIND_SOURCES).map((source) => ({
      id: source.id,
      roomName: room.name,
      x: source.pos?.x,
      y: source.pos?.y,
    })),
  ),
});

const captureSurvivalWorkerWorld = (
  roomDefenseStates: readonly RoomDefenseState[],
): WorkerWorldSnapshot => ({
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
      roomDefenseState: readRoomDefenseState(roomDefenseStates, room.name),
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
  constructionSites: [],
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
  creeps: Object.values(Game.creeps).map(captureWorkerCreepSnapshot),
  energyStructures: Object.values(Game.rooms).flatMap((room) =>
    room
      .find(FIND_MY_STRUCTURES)
      .filter(isWorkerEnergyStructure)
      .map((energyStructure) => ({
        availableEnergy: energyStructure.store.getUsedCapacity(RESOURCE_ENERGY),
        energyCapacity: readSpawnExtensionEnergyCapacity(energyStructure, room),
        id: energyStructure.id,
        roomName: energyStructure.pos.roomName,
      })),
  ),
  repairTargets: [],
  sources: Object.values(Game.rooms).flatMap((room) =>
    room.find(FIND_SOURCES).map((source) => ({
      id: source.id,
      roomName: room.name,
      x: source.pos?.x,
      y: source.pos?.y,
    })),
  ),
});

const captureWorkerCreepSnapshot = (creep: Creep): WorkerWorldSnapshot['creeps'][number] => {
  const energy = creep.store.getUsedCapacity(RESOURCE_ENERGY);
  const freeCapacity = creep.store.getFreeCapacity(RESOURCE_ENERGY);
  const energyMode = selectAndPersistWorkerEnergyMode(creep, energy, freeCapacity);

  return {
    energy,
    energyMode,
    freeCapacity,
    name: creep.name,
    roomName: creep.room.name,
  };
};

const selectAndPersistWorkerEnergyMode = (
  creep: Creep,
  energy: number,
  freeCapacity: number,
): WorkerEnergyMode => {
  const workerEnergyMode = selectWorkerEnergyMode(creep, energy, freeCapacity);
  const creepMemory = readMutableCreepMemory(creep);

  creepMemory['working'] = workerEnergyMode === 'working';

  return workerEnergyMode;
};

const selectWorkerEnergyMode = (
  creep: Creep,
  energy: number,
  freeCapacity: number,
): WorkerEnergyMode => {
  if (energy <= 0) {
    return 'harvesting';
  }

  if (freeCapacity <= 0) {
    return 'working';
  }

  return readMutableCreepMemory(creep)['working'] === true ? 'working' : 'harvesting';
};

const readMutableCreepMemory = (creep: Creep): Record<string, unknown> => {
  const creepWithMemory = creep as unknown as { memory?: Record<string, unknown> };

  creepWithMemory.memory ??= {};

  return creepWithMemory.memory;
};

const toDefenseCoreStructureSnapshot = (
  structure: AnyOwnedStructure,
): readonly [DefenseCoreStructureSnapshot] | readonly [] => {
  if (!isDefenseCoreStructure(structure)) {
    return [];
  }

  return [
    {
      id: structure.id,
      roomName: structure.pos.roomName,
      structureType: structure.structureType,
      x: structure.pos.x,
      y: structure.pos.y,
    },
  ];
};

const isDefenseCoreStructure = (
  structure: AnyOwnedStructure,
): structure is StructureExtension | StructureSpawn | StructureTower =>
  structure.structureType === STRUCTURE_EXTENSION ||
  structure.structureType === STRUCTURE_SPAWN ||
  structure.structureType === STRUCTURE_TOWER;

const readRoomDefenseState = (
  roomDefenseStates: readonly RoomDefenseState[],
  roomName: string,
): RoomDefenseState => {
  const roomDefenseState = roomDefenseStates.find(
    (candidateDefenseState) => candidateDefenseState.roomName === roomName,
  );

  if (roomDefenseState === undefined) {
    throw new Error(`Room "${roomName}" does not have a defense state.`);
  }

  return roomDefenseState;
};

const captureRoomEnergyStructures = (room: Room): readonly SpawnExtensionEnergySnapshot[] =>
  room
    .find(FIND_MY_STRUCTURES)
    .filter(isWorkerEnergyStructure)
    .map((energyStructure) => ({
      availableEnergy: energyStructure.store.getUsedCapacity(RESOURCE_ENERGY),
      energyCapacity: readSpawnExtensionEnergyCapacity(energyStructure, room),
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

const executeDefenseDecisions = (defenseDecisions: readonly DefenseDecision[]): void => {
  for (const defenseDecision of defenseDecisions) {
    executeDefenseDecision(defenseDecision);
  }
};

const executeDefenseDecision = (defenseDecision: DefenseDecision): void => {
  switch (defenseDecision.type) {
    case 'activateSafeMode': {
      const controller = readSafeModeController(defenseDecision.controllerId);

      controller.activateSafeMode();
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

const readSafeModeController = (controllerId: string): StructureController => {
  const controller = Game.getObjectById(controllerId as Id<StructureController>);

  if (controller === null) {
    throw new Error(`Screeps controller "${controllerId}" does not exist for defense action.`);
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

const isWorkerEnergyStructure = (
  structure: AnyOwnedStructure,
): structure is StructureExtension | StructureSpawn =>
  structure.structureType === STRUCTURE_EXTENSION || structure.structureType === STRUCTURE_SPAWN;

const readSpawnExtensionEnergyCapacity = (
  energyStructure: StructureExtension | StructureSpawn,
  room: Room,
): number => {
  switch (energyStructure.structureType) {
    case STRUCTURE_EXTENSION:
      return EXTENSION_ENERGY_CAPACITY[room.controller?.level ?? 0];
    case STRUCTURE_SPAWN:
      return SPAWN_ENERGY_CAPACITY;
  }
};

const toPositionSnapshot = (
  roomObject: RoomObject,
): { readonly x: number; readonly y: number } => ({
  x: roomObject.pos.x,
  y: roomObject.pos.y,
});

const captureRoomInteriorTerrain = (room: Room): readonly ConstructionTerrainSnapshot[] => {
  const roomTerrain = room.getTerrain();
  const terrainSnapshots: ConstructionTerrainSnapshot[] = [];

  for (let y = 1; y <= 48; y += 1) {
    for (let x = 1; x <= 48; x += 1) {
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
