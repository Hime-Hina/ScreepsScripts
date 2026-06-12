import {
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
import type { WorkerActionDecision, WorkerWorldSnapshot } from '../creeps/worker-decision';
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
  readMemoryState(): ScreepsMemoryState;
  writeMemoryState(memoryState: ScreepsMemoryState): void;
}

export const captureScreepsTickRuntime = (): ScreepsTickRuntime => ({
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
  gameTime: Game.time,
  spawns: Object.values(Game.spawns).map((spawn) => ({
    availableEnergy: spawn.store.getUsedCapacity(RESOURCE_ENERGY),
    energyCapacity: readEnergyCapacity(spawn.store),
    isSpawning: spawn.spawning !== null,
    name: spawn.name,
  })),
  workerCreepCount: Object.keys(Game.creeps).length,
});

const captureConstructionWorld = (): ConstructionWorldSnapshot => ({
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
  constructionSites: Object.values(Game.rooms).flatMap((room) =>
    room.find(FIND_MY_CONSTRUCTION_SITES).map((constructionSite) => ({
      id: constructionSite.id,
      roomName: constructionSite.pos.roomName,
    })),
  ),
  controllers: Object.values(Game.rooms).flatMap((room) => {
    const roomController = room.controller;

    if (roomController === undefined) {
      return [];
    }

    return [
      {
        id: roomController.id,
        roomName: room.name,
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
  sources: Object.values(Game.rooms).flatMap((room) =>
    room.find(FIND_SOURCES).map((source) => ({
      id: source.id,
      roomName: room.name,
    })),
  ),
});

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

const readSource = (sourceId: string): Source => {
  const source = Game.getObjectById(sourceId as Id<Source>);

  if (source === null) {
    throw new Error(`Screeps source "${sourceId}" does not exist for worker action.`);
  }

  return source;
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
