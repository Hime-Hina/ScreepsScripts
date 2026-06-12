import {
  readScreepsMemoryState,
  writeScreepsMemoryState,
  type ScreepsMemoryState,
} from '../memory/screeps-memory';
import type { WorkerActionDecision, WorkerWorldSnapshot } from '../creeps/worker-decision';
import type { SpawningWorldSnapshot } from '../spawning/spawn-decision';
import type { SpawnDecision } from '../spawning/spawn-decision';

export interface ScreepsTickIO {
  executeSpawnDecision(spawnDecision: SpawnDecision): void;
  executeWorkerActions(workerDecisions: readonly WorkerActionDecision[]): void;
  readonly gameTime: number;
  readCpuUsed(): number;
  readSpawningWorld(): SpawningWorldSnapshot;
  readWorkerWorld(): WorkerWorldSnapshot;
  writeConsoleLine(message: string): void;
}

export interface ScreepsTickRuntime extends ScreepsTickIO {
  readMemoryState(): ScreepsMemoryState;
  writeMemoryState(memoryState: ScreepsMemoryState): void;
}

export const captureScreepsTickRuntime = (): ScreepsTickRuntime => ({
  executeSpawnDecision,
  executeWorkerActions,
  gameTime: Game.time,
  readCpuUsed: () => Game.cpu.getUsed(),
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

const captureWorkerWorld = (): WorkerWorldSnapshot => ({
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
  sources: Object.values(Game.rooms).flatMap((room) =>
    room.find(FIND_SOURCES).map((source) => ({
      id: source.id,
      roomName: room.name,
    })),
  ),
  spawns: Object.values(Game.spawns).map((spawn) => ({
    availableEnergy: spawn.store.getUsedCapacity(RESOURCE_ENERGY),
    energyCapacity: readEnergyCapacity(spawn.store),
    name: spawn.name,
    roomName: spawn.pos.roomName,
  })),
});

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

    case 'refillSpawn': {
      const spawn = readOwnedSpawn(workerDecision.spawnName);
      const actionReturnCode = creep.transfer(spawn, RESOURCE_ENERGY);

      moveToActionTargetWhenOutOfRange(actionReturnCode, creep, spawn);
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

const readOwnedSpawn = (spawnName: string): StructureSpawn => {
  const spawn = Game.spawns[spawnName];

  if (spawn === undefined) {
    throw new Error(`Spawn "${spawnName}" does not exist for worker action.`);
  }

  return spawn;
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
