import {
  applyGmFlagDirectives,
  installGmConsoleTools,
  recordGmExecutedWorkerIntent,
  recordGmPlannedWorkerIntent,
  recordGmWorkerIntentError,
  runGmConsoleWatches,
  selectGmRuntimeStrategyDecision,
  type GmRuntimeStrategyDecision,
  type GmRuntimeStrategySelectionInput,
} from '../console/gm-console';
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
import type {
  TowerActionDecision,
  TowerRepairTargetSnapshot,
  TowerWorldSnapshot,
} from '../defense/tower-planner';
import type {
  SpawnCreepRole,
  SpawnDecision,
  SpawningWorldSnapshot,
} from '../spawning/spawn-decision';
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
  applyGmFlagDirectives?(): readonly string[];
  executeConstructionDecisions(constructionDecisions: readonly ConstructionDecision[]): void;
  executeDefenseDecisions(defenseDecisions: readonly DefenseDecision[]): void;
  executeSpawnDecision(spawnDecision: SpawnDecision): void;
  executeTowerActions(towerDecisions: readonly TowerActionDecision[]): void;
  executeWorkerActions(workerDecisions: readonly WorkerActionDecision[]): void;
  installGmConsoleTools?(): void;
  readonly gameTime: number;
  readonly shardName: string;
  readCpuSnapshot(): RuntimeCpuSnapshot;
  readConstructionWorld(): ConstructionWorldSnapshot;
  readDefenseWorld(): DefenseWorldSnapshot;
  readSpawningWorld(): SpawningWorldSnapshot;
  readSurvivalSpawningWorld(): SpawningWorldSnapshot;
  readSurvivalWorkerWorld(roomDefenseStates: readonly RoomDefenseState[]): WorkerWorldSnapshot;
  readTowerWorld(): TowerWorldSnapshot;
  readWorkerWorld(roomDefenseStates: readonly RoomDefenseState[]): WorkerWorldSnapshot;
  runGmConsoleWatches?(): void;
  selectGmRuntimeStrategyDecision?(
    input: GmRuntimeStrategySelectionInput,
  ): GmRuntimeStrategyDecision;
  sendRuntimeAlert(alertDecision: RuntimeAlertDecision): void;
  writeConsoleLine(message: string): void;
}

export interface ScreepsTickRuntime extends ScreepsTickIO {
  cleanStaleCreepMemory(): void;
  readMemoryState(): ScreepsMemoryState;
  writeMemoryState(memoryState: ScreepsMemoryState): void;
}

export const captureScreepsTickRuntime = (): ScreepsTickRuntime => ({
  applyGmFlagDirectives: () => applyGmFlagDirectives((message) => console.log(message)),
  cleanStaleCreepMemory: () => cleanStaleCreepMemory(Memory, new Set(Object.keys(Game.creeps))),
  executeConstructionDecisions,
  executeDefenseDecisions,
  executeSpawnDecision,
  executeTowerActions,
  executeWorkerActions,
  gameTime: Game.time,
  installGmConsoleTools,
  readCpuSnapshot: captureRuntimeCpuSnapshot,
  readConstructionWorld: captureConstructionWorld,
  readDefenseWorld: captureDefenseWorld,
  readMemoryState: () => readScreepsMemoryState(Memory),
  readSpawningWorld: captureSpawningWorld,
  readSurvivalSpawningWorld: captureSurvivalSpawningWorld,
  readSurvivalWorkerWorld: captureSurvivalWorkerWorld,
  readTowerWorld: captureTowerWorld,
  readWorkerWorld: captureWorkerWorld,
  runGmConsoleWatches: () => runGmConsoleWatches((message) => console.log(message)),
  selectGmRuntimeStrategyDecision,
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
    isOwned: room.controller?.my === true,
    roomName: room.name,
    sourceContainerCount: countRoomSourceContainers(room),
    spawningWorkerCount: countRoomSpawningWorkerCreeps(room.name),
    sourceCount: room.find(FIND_SOURCES).length,
    structures: room.find(FIND_STRUCTURES).map((structure) => ({
      structureType: structure.structureType,
    })),
    ticksToDowngrade: room.controller?.ticksToDowngrade ?? 0,
    workerCreepCount: countRoomWorkerCreeps(room.name),
    workerCreeps: captureRoomWorkerCreeps(room.name),
    workerCreepWorkParts: countRoomWorkerWorkParts(room.name),
  })),
  spawns: Object.values(Game.spawns).map((spawn) => ({
    availableEnergy: readSpawnRoomEnergyAvailable(spawn),
    energyCapacity: readSpawnRoomEnergyCapacityAvailable(spawn),
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
    isOwned: room.controller?.my === true,
    roomName: room.name,
    sourceContainerCount: countRoomSourceContainers(room),
    spawningWorkerCount: countRoomSpawningWorkerCreeps(room.name),
    sourceCount: room.find(FIND_SOURCES).length,
    structures: [],
    ticksToDowngrade: room.controller?.ticksToDowngrade ?? 0,
    workerCreepCount: countRoomWorkerCreeps(room.name),
    workerCreeps: captureRoomWorkerCreeps(room.name),
    workerCreepWorkParts: countRoomWorkerWorkParts(room.name),
  })),
  spawns: Object.values(Game.spawns).map((spawn) => ({
    availableEnergy: readSpawnRoomEnergyAvailable(spawn),
    energyCapacity: readSpawnRoomEnergyCapacityAvailable(spawn),
    isSpawning: spawn.spawning !== null,
    name: spawn.name,
    roomName: spawn.pos.roomName,
  })),
});

const readSpawnRoomEnergyAvailable = (spawn: StructureSpawn): number =>
  spawn.room?.energyAvailable ??
  Game.rooms[spawn.pos.roomName]?.energyAvailable ??
  spawn.store.getUsedCapacity(RESOURCE_ENERGY);

const readSpawnRoomEnergyCapacityAvailable = (spawn: StructureSpawn): number =>
  spawn.room?.energyCapacityAvailable ??
  Game.rooms[spawn.pos.roomName]?.energyCapacityAvailable ??
  SPAWN_ENERGY_CAPACITY;

const countRoomSourceContainers = (room: Room): number => {
  const roomSources = room.find(FIND_SOURCES);

  return roomSources.filter(
    (source) =>
      hasRoomPosition(source.pos) &&
      room
        .find(FIND_STRUCTURES)
        .filter(isContainerStructure)
        .some(
          (container) =>
            hasRoomPosition(container.pos) &&
            measureRoomPositionRange(container.pos, source.pos) <= 1,
        ),
  ).length;
};

const hasRoomPosition = (
  position: { readonly x?: number; readonly y?: number } | undefined,
): position is { readonly x: number; readonly y: number } =>
  position?.x !== undefined && position.y !== undefined;

const measureRoomPositionRange = (
  leftPosition: { readonly x: number; readonly y: number },
  rightPosition: { readonly x: number; readonly y: number },
): number =>
  Math.max(Math.abs(leftPosition.x - rightPosition.x), Math.abs(leftPosition.y - rightPosition.y));

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

const captureTowerWorld = (): TowerWorldSnapshot => {
  const ownedRooms = Object.values(Game.rooms).filter((room) => room.controller?.my === true);

  return {
    hostileCreeps: ownedRooms.flatMap((room) =>
      room.find(FIND_HOSTILE_CREEPS).map((hostileCreep) => ({
        hits: hostileCreep.hits,
        id: hostileCreep.id,
        roomName: hostileCreep.pos.roomName,
        x: hostileCreep.pos.x,
        y: hostileCreep.pos.y,
      })),
    ),
    ownedCreeps: Object.values(Game.creeps)
      .filter((creep) => Game.rooms[creep.room.name]?.controller?.my === true)
      .map((creep) => ({
        hits: creep.hits,
        hitsMax: creep.hitsMax,
        name: creep.name,
        roomName: creep.room.name,
        x: creep.pos?.x ?? 0,
        y: creep.pos?.y ?? 0,
      })),
    repairTargets: ownedRooms.flatMap((room) =>
      room.find(FIND_STRUCTURES).flatMap(toTowerRepairTargetSnapshot),
    ),
    towerEnergyCost: TOWER_ENERGY_COST,
    towers: ownedRooms.flatMap((room) =>
      room
        .find(FIND_MY_STRUCTURES)
        .filter(isTowerStructure)
        .map((tower) => ({
          energy: tower.store.getUsedCapacity(RESOURCE_ENERGY),
          energyCapacity: readTowerEnergyCapacity(tower),
          id: tower.id,
          roomName: tower.pos.roomName,
          x: tower.pos.x,
          y: tower.pos.y,
        })),
    ),
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
  energyDeposits: Object.values(Game.rooms).flatMap(captureRoomEnergyDeposits),
  energyPickups: Object.values(Game.rooms).flatMap((room) =>
    room
      .find(FIND_DROPPED_RESOURCES)
      .filter((resource) => resource.resourceType === RESOURCE_ENERGY)
      .map((resource) => ({
        amount: resource.amount,
        id: resource.id,
        roomName: resource.pos.roomName,
        x: resource.pos.x,
        y: resource.pos.y,
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
    captureRoomWorkerEnergyStructures(room, { includeTowers: true }),
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
  energyDeposits: Object.values(Game.rooms).flatMap(captureRoomEnergyDeposits),
  energyPickups: Object.values(Game.rooms).flatMap((room) =>
    room
      .find(FIND_DROPPED_RESOURCES)
      .filter((resource) => resource.resourceType === RESOURCE_ENERGY)
      .map((resource) => ({
        amount: resource.amount,
        id: resource.id,
        roomName: resource.pos.roomName,
        x: resource.pos.x,
        y: resource.pos.y,
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
    captureRoomWorkerEnergyStructures(room, { includeTowers: false }),
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

  const creepRole = readCreepRole(creep);

  if (creepRole === undefined) {
    return {
      energy,
      energyMode,
      freeCapacity,
      name: creep.name,
      roomName: creep.room.name,
      x: creep.pos?.x,
      y: creep.pos?.y,
    };
  }

  return {
    energy,
    energyMode,
    freeCapacity,
    name: creep.name,
    role: creepRole,
    roomName: creep.room.name,
    x: creep.pos?.x,
    y: creep.pos?.y,
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

const readCreepRole = (creep: Creep): SpawnCreepRole | undefined => {
  const role = readMutableCreepMemory(creep)['role'];

  switch (role) {
    case 'worker':
    case 'miner':
    case 'hauler':
    case 'builder':
    case 'upgrader':
      return role;

    default:
      return undefined;
  }
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
    .filter(isSpawnExtensionEnergyStructure)
    .map((energyStructure) => ({
      availableEnergy: energyStructure.store.getUsedCapacity(RESOURCE_ENERGY),
      energyCapacity: readSpawnExtensionEnergyCapacity(energyStructure, room),
    }));

const captureRoomWorkerEnergyStructures = (
  room: Room,
  options: { readonly includeTowers: boolean },
): WorkerWorldSnapshot['energyStructures'] =>
  room
    .find(FIND_MY_STRUCTURES)
    .filter((structure): structure is StructureExtension | StructureSpawn | StructureTower =>
      options.includeTowers
        ? isWorkerEnergyStructure(structure)
        : isSpawnExtensionEnergyStructure(structure),
    )
    .map((energyStructure) => ({
      availableEnergy: energyStructure.store.getUsedCapacity(RESOURCE_ENERGY),
      energyCapacity: readWorkerEnergyCapacity(energyStructure, room),
      id: energyStructure.id,
      roomName: energyStructure.pos.roomName,
      structureType: energyStructure.structureType,
      x: energyStructure.pos.x,
      y: energyStructure.pos.y,
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

const toTowerRepairTargetSnapshot = (
  structure: Structure,
): readonly [TowerRepairTargetSnapshot] | readonly [] => {
  if (!isTowerRepairStructureType(structure.structureType)) {
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

const isTowerRepairStructureType = (
  structureType: string,
): structureType is TowerRepairTargetSnapshot['structureType'] => {
  switch (structureType) {
    case STRUCTURE_CONTAINER:
    case STRUCTURE_EXTENSION:
    case STRUCTURE_ROAD:
    case STRUCTURE_SPAWN:
    case STRUCTURE_TOWER:
      return true;

    default:
      return false;
  }
};

const captureRoomWorkerCreeps = (
  roomName: string,
): NonNullable<SpawningWorldSnapshot['rooms'][number]['workerCreeps']> =>
  Object.values(Game.creeps)
    .filter((creep) => creep.room.name === roomName)
    .flatMap((creep): NonNullable<SpawningWorldSnapshot['rooms'][number]['workerCreeps']> => {
      const ticksToLive = creep.ticksToLive ?? 0;
      const creepRole = readCreepRole(creep);

      return creepRole === undefined ? [{ ticksToLive }] : [{ role: creepRole, ticksToLive }];
    });

const countRoomWorkerCreeps = (roomName: string): number =>
  Object.values(Game.creeps).filter((creep) => creep.room.name === roomName).length;

const countRoomSpawningWorkerCreeps = (roomName: string): number =>
  Object.values(Game.spawns).filter(
    (spawn) =>
      spawn.pos.roomName === roomName &&
      spawn.spawning !== null &&
      isBootstrapWorkerCreepName(spawn.spawning.name),
  ).length;

const isBootstrapWorkerCreepName = (creepName: string | undefined): boolean =>
  creepName?.includes('-worker-') === true ||
  creepName?.includes('-miner-') === true ||
  creepName?.includes('-hauler-') === true ||
  creepName?.includes('-builder-') === true ||
  creepName?.includes('-upgrader-') === true;

const countRoomWorkerWorkParts = (roomName: string): number =>
  Object.values(Game.creeps)
    .filter((creep) => creep.room.name === roomName)
    .reduce(
      (totalWorkParts, creep) =>
        totalWorkParts +
        (creep.body ?? []).filter((bodyPart) => bodyPart.type === WORK && bodyPart.hits > 0).length,
      0,
    );

const captureRoomEnergyDeposits = (room: Room): WorkerWorldSnapshot['energyDeposits'] =>
  room
    .find(FIND_STRUCTURES)
    .filter(isContainerStructure)
    .flatMap((container) => {
      const freeCapacity =
        typeof container.store.getFreeCapacity === 'function'
          ? container.store.getFreeCapacity(RESOURCE_ENERGY)
          : 0;

      if (freeCapacity <= 0) {
        return [];
      }

      return [
        {
          freeCapacity,
          id: container.id,
          roomName: container.pos.roomName,
          targetType: 'container' as const,
          x: container.pos.x,
          y: container.pos.y,
        },
      ];
    });

const captureRoomEnergyWithdrawals = (room: Room): WorkerWorldSnapshot['energyWithdrawals'] => {
  const energyWithdrawalsById = new Map<string, WorkerWorldSnapshot['energyWithdrawals'][number]>();

  for (const energyWithdrawal of [
    ...room
      .find(FIND_TOMBSTONES)
      .flatMap((tombstone) => toEnergyWithdrawalSnapshot(tombstone, 'tombstone')),
    ...room.find(FIND_RUINS).flatMap((ruin) => toEnergyWithdrawalSnapshot(ruin, 'ruin')),
    ...room
      .find(FIND_MY_STRUCTURES)
      .filter(isOwnedEnergyWithdrawalStructure)
      .flatMap((structure) =>
        toEnergyWithdrawalSnapshot(structure, selectStructureWithdrawalTargetType(structure)),
      ),
    ...room
      .find(FIND_STRUCTURES)
      .filter(isContainerStructure)
      .flatMap((container) => toEnergyWithdrawalSnapshot(container, 'container')),
  ]) {
    energyWithdrawalsById.set(energyWithdrawal.id, energyWithdrawal);
  }

  return [...energyWithdrawalsById.values()];
};

const toEnergyWithdrawalSnapshot = (
  storeObject: RoomObject & { readonly id: string; readonly store: StoreDefinition },
  targetType: Exclude<WorkerWorldSnapshot['energyWithdrawals'][number]['targetType'], undefined>,
):
  | readonly [
      {
        readonly availableEnergy: number;
        readonly id: string;
        readonly roomName: string;
        readonly targetType: Exclude<
          WorkerWorldSnapshot['energyWithdrawals'][number]['targetType'],
          undefined
        >;
        readonly x?: number;
        readonly y?: number;
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
      targetType,
      x: storeObject.pos.x,
      y: storeObject.pos.y,
    },
  ];
};

const isOwnedEnergyWithdrawalStructure = (
  structure: AnyOwnedStructure,
): structure is AnyOwnedStructure & { readonly store: StoreDefinition } =>
  !isWorkerEnergyStructure(structure) && 'store' in structure;

const isContainerStructure = (structure: Structure): structure is StructureContainer =>
  structure.structureType === STRUCTURE_CONTAINER;

const selectStructureWithdrawalTargetType = (
  structure: AnyOwnedStructure,
): Exclude<WorkerWorldSnapshot['energyWithdrawals'][number]['targetType'], undefined> => {
  if (structure.structureType === STRUCTURE_STORAGE) {
    return 'storage';
  }

  if (structure.structureType === STRUCTURE_TERMINAL) {
    return 'terminal';
  }

  return 'structure';
};

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

const executeTowerActions = (towerDecisions: readonly TowerActionDecision[]): void => {
  for (const towerDecision of towerDecisions) {
    executeTowerAction(towerDecision);
  }
};

const executeTowerAction = (towerDecision: TowerActionDecision): void => {
  const tower = readTower(towerDecision.towerId);

  switch (towerDecision.type) {
    case 'attackHostileCreep': {
      tower.attack(readTowerHostileCreep(towerDecision.hostileCreepId));
      return;
    }

    case 'healOwnedCreep': {
      tower.heal(readOwnedCreep(towerDecision.creepName));
      return;
    }

    case 'repairStructure': {
      tower.repair(readTowerRepairStructure(towerDecision.structureId));
      return;
    }
  }
};

const executeSpawnDecision = (spawnDecision: SpawnDecision): void => {
  const spawn = Game.spawns[spawnDecision.spawnName];

  if (spawn === undefined) {
    throw new Error(`Spawn "${spawnDecision.spawnName}" does not exist for spawn decision.`);
  }

  if (spawnDecision.creepRole === undefined) {
    spawn.spawnCreep([...spawnDecision.body], spawnDecision.creepName);
    return;
  }

  spawn.spawnCreep([...spawnDecision.body], spawnDecision.creepName, {
    memory: {
      role: spawnDecision.creepRole,
    },
  });
};

const executeWorkerActions = (workerDecisions: readonly WorkerActionDecision[]): void => {
  for (const workerDecision of workerDecisions) {
    executeWorkerAction(workerDecision);
  }
};

const executeWorkerAction = (workerDecision: WorkerActionDecision): void => {
  recordGmPlannedWorkerIntent(workerDecision);

  try {
    const creep = readOwnedCreep(workerDecision.creepName);

    switch (workerDecision.type) {
      case 'harvestSource': {
        const source = readSource(workerDecision.sourceId);
        const actionReturnCode = creep.harvest(source);

        recordGmExecutedWorkerIntent(workerDecision, source, actionReturnCode);
        moveToActionTargetWhenOutOfRange(actionReturnCode, creep, source);
        return;
      }

      case 'pickupEnergy': {
        const droppedEnergy = readDroppedEnergy(workerDecision.resourceId);
        const actionReturnCode = creep.pickup(droppedEnergy);

        recordGmExecutedWorkerIntent(workerDecision, droppedEnergy, actionReturnCode);
        moveToActionTargetWhenOutOfRange(actionReturnCode, creep, droppedEnergy);
        return;
      }

      case 'withdrawEnergy': {
        const energyWithdrawalTarget = readEnergyWithdrawalTarget(workerDecision.structureId);
        const actionReturnCode = creep.withdraw(energyWithdrawalTarget, RESOURCE_ENERGY);

        recordGmExecutedWorkerIntent(workerDecision, energyWithdrawalTarget, actionReturnCode);
        moveToActionTargetWhenOutOfRange(actionReturnCode, creep, energyWithdrawalTarget);
        return;
      }

      case 'depositEnergy': {
        const energyDepositTarget = readEnergyDepositTarget(workerDecision.structureId);
        const actionReturnCode = creep.transfer(energyDepositTarget, RESOURCE_ENERGY);

        recordGmExecutedWorkerIntent(workerDecision, energyDepositTarget, actionReturnCode);
        moveToActionTargetWhenOutOfRange(actionReturnCode, creep, energyDepositTarget);
        return;
      }

      case 'refillEnergyStructure': {
        const energyStructure = readEnergyStructure(workerDecision.structureId);
        const actionReturnCode = creep.transfer(energyStructure, RESOURCE_ENERGY);

        recordGmExecutedWorkerIntent(workerDecision, energyStructure, actionReturnCode);
        moveToActionTargetWhenOutOfRange(actionReturnCode, creep, energyStructure);
        return;
      }

      case 'buildConstructionSite': {
        const constructionSite = readConstructionSite(workerDecision.constructionSiteId);
        const actionReturnCode = creep.build(constructionSite);

        recordGmExecutedWorkerIntent(workerDecision, constructionSite, actionReturnCode);
        moveToActionTargetWhenOutOfRange(actionReturnCode, creep, constructionSite);
        return;
      }

      case 'repairStructure': {
        const repairStructure = readRepairStructure(workerDecision.structureId);
        const actionReturnCode = creep.repair(repairStructure);

        recordGmExecutedWorkerIntent(workerDecision, repairStructure, actionReturnCode);
        moveToActionTargetWhenOutOfRange(actionReturnCode, creep, repairStructure);
        return;
      }

      case 'upgradeController': {
        const controller = readController(workerDecision.controllerId);
        const actionReturnCode = creep.upgradeController(controller);

        recordGmExecutedWorkerIntent(workerDecision, controller, actionReturnCode);
        moveToActionTargetWhenOutOfRange(actionReturnCode, creep, controller);
        return;
      }
    }
  } catch (caughtError) {
    recordGmWorkerIntentError(workerDecision, readRuntimeCaughtErrorMessage(caughtError));
    throw caughtError;
  }
};

const readRuntimeCaughtErrorMessage = (caughtError: unknown): string => {
  if (caughtError instanceof Error) {
    return caughtError.message;
  }

  return String(caughtError);
};

const readOwnedCreep = (creepName: string): Creep => {
  const creep = Game.creeps[creepName];

  if (creep === undefined) {
    throw new Error(`Creep "${creepName}" does not exist for worker action.`);
  }

  return creep;
};

const readEnergyStructure = (
  structureId: string,
): StructureExtension | StructureSpawn | StructureTower => {
  const energyStructure = Game.getObjectById(
    structureId as Id<StructureExtension | StructureSpawn | StructureTower>,
  );

  if (energyStructure === null) {
    throw new Error(`Energy structure "${structureId}" does not exist for worker action.`);
  }

  return energyStructure;
};

const readEnergyDepositTarget = (structureId: string): StructureContainer => {
  const energyDepositTarget = Game.getObjectById(structureId as Id<StructureContainer>);

  if (energyDepositTarget === null) {
    throw new Error(`Energy deposit target "${structureId}" does not exist for worker action.`);
  }

  return energyDepositTarget;
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

const readTower = (towerId: string): StructureTower => {
  const tower = Game.getObjectById(towerId as Id<StructureTower>);

  if (tower === null) {
    throw new Error(`Tower "${towerId}" does not exist for tower action.`);
  }

  return tower;
};

const readTowerHostileCreep = (creepId: string): Creep => {
  const creep = Game.getObjectById(creepId as Id<Creep>);

  if (creep === null) {
    throw new Error(`Hostile creep "${creepId}" does not exist for tower action.`);
  }

  return creep;
};

const readTowerRepairStructure = (structureId: string): Structure => {
  const structure = Game.getObjectById(structureId as Id<Structure>);

  if (structure === null) {
    throw new Error(`Repair structure "${structureId}" does not exist for tower action.`);
  }

  return structure;
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
): structure is StructureExtension | StructureSpawn | StructureTower =>
  isSpawnExtensionEnergyStructure(structure) || isTowerStructure(structure);

const isSpawnExtensionEnergyStructure = (
  structure: AnyOwnedStructure,
): structure is StructureExtension | StructureSpawn =>
  structure.structureType === STRUCTURE_EXTENSION || structure.structureType === STRUCTURE_SPAWN;

const isTowerStructure = (structure: AnyOwnedStructure): structure is StructureTower =>
  structure.structureType === STRUCTURE_TOWER;

const readWorkerEnergyCapacity = (
  energyStructure: StructureExtension | StructureSpawn | StructureTower,
  room: Room,
): number => {
  switch (energyStructure.structureType) {
    case STRUCTURE_EXTENSION:
    case STRUCTURE_SPAWN:
      return readSpawnExtensionEnergyCapacity(energyStructure, room);
    case STRUCTURE_TOWER:
      return readTowerEnergyCapacity(energyStructure);
  }
};

const readTowerEnergyCapacity = (tower: StructureTower): number =>
  tower.store.getCapacity(RESOURCE_ENERGY) ?? 0;

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
