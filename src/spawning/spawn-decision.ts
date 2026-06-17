import {
  BOOTSTRAP_SURVIVAL_WORKER_COUNT,
  classifyBootstrapControllerDowngradeState,
  classifySpawnExtensionEnergyState,
  selectBootstrapWorkerDemand,
  type BootstrapSpawnAvailability,
} from '../colony/bootstrap-economy';

export type SpawnBodyPart = 'work' | 'carry' | 'move';

export interface SpawnSnapshot {
  readonly availableEnergy: number;
  readonly energyCapacity: number;
  readonly isSpawning: boolean;
  readonly name: string;
  readonly roomName: string;
}

export interface SpawningEnergyStructureSnapshot {
  readonly availableEnergy: number;
  readonly energyCapacity: number;
}

export interface SpawningStructureSnapshot {
  readonly structureType: string;
}

export interface SpawningConstructionSiteSnapshot {
  readonly remainingWork: number;
  readonly structureType: string;
}

export interface SpawningRoomSnapshot {
  readonly constructionSites: readonly SpawningConstructionSiteSnapshot[];
  readonly controllerLevel: number;
  readonly energyStructures: readonly SpawningEnergyStructureSnapshot[];
  readonly roomName: string;
  readonly structures: readonly SpawningStructureSnapshot[];
  readonly ticksToDowngrade: number;
  readonly workerCreepCount: number;
}

export interface SpawningWorldSnapshot {
  readonly bodyPartCosts: Readonly<Record<SpawnBodyPart, number>>;
  readonly constructionCosts: Readonly<{
    readonly extension: number;
  }>;
  readonly controllerStructureLimits: Readonly<{
    readonly extension: Readonly<Record<number, number>>;
  }>;
  readonly gameTime: number;
  readonly rooms: readonly SpawningRoomSnapshot[];
  readonly spawns: readonly SpawnSnapshot[];
}

export interface SpawnDecision {
  readonly body: readonly SpawnBodyPart[];
  readonly creepName: string;
  readonly spawnName: string;
}

const INITIAL_WORKER_BODY = ['work', 'carry', 'move'] as const satisfies readonly SpawnBodyPart[];
const EARLY_WORKER_BODIES = [
  ['work', 'work', 'carry', 'carry', 'carry', 'move', 'move', 'move', 'move'],
  ['work', 'carry', 'carry', 'move', 'move'],
  INITIAL_WORKER_BODY,
] as const satisfies readonly (readonly SpawnBodyPart[])[];

export const planBootstrapWorkerSpawn = (
  spawningWorld: SpawningWorldSnapshot,
): SpawnDecision | null => {
  for (const spawnSnapshot of spawningWorld.spawns) {
    const spawningRoom = readSpawningRoom(spawningWorld, spawnSnapshot.roomName);
    const workerDemand = selectBootstrapWorkerDemand({
      constructionBacklogEnergy: calculateConstructionBacklogEnergy(spawningRoom, spawningWorld),
      controllerDowngradeState: classifyBootstrapControllerDowngradeState({
        roomName: spawningRoom.roomName,
        ticksToDowngrade: spawningRoom.ticksToDowngrade,
      }),
      controllerLevel: spawningRoom.controllerLevel,
      energyState: classifySpawnExtensionEnergyState(spawningRoom),
      spawnAvailability: classifySpawnAvailability(spawnSnapshot),
      workerCreepCount: spawningRoom.workerCreepCount,
    });

    if (spawningRoom.workerCreepCount >= workerDemand.targetWorkerCount) {
      continue;
    }

    if (spawnSnapshot.isSpawning) {
      continue;
    }

    const workerBody = selectEarlyWorkerBody(spawnSnapshot, spawningWorld.bodyPartCosts);

    if (workerBody === null) {
      continue;
    }

    return {
      body: workerBody,
      creepName: `${spawnSnapshot.name}-worker-${spawningWorld.gameTime}`,
      spawnName: spawnSnapshot.name,
    };
  }

  return null;
};

export const planBootstrapSurvivalWorkerSpawn = (
  spawningWorld: SpawningWorldSnapshot,
): SpawnDecision | null => {
  for (const spawnSnapshot of spawningWorld.spawns) {
    const spawningRoom = readSpawningRoom(spawningWorld, spawnSnapshot.roomName);

    if (spawningRoom.workerCreepCount >= BOOTSTRAP_SURVIVAL_WORKER_COUNT) {
      continue;
    }

    if (spawnSnapshot.isSpawning) {
      continue;
    }

    const workerBody = selectEarlyWorkerBody(spawnSnapshot, spawningWorld.bodyPartCosts);

    if (workerBody === null) {
      continue;
    }

    return {
      body: workerBody,
      creepName: `${spawnSnapshot.name}-worker-${spawningWorld.gameTime}`,
      spawnName: spawnSnapshot.name,
    };
  }

  return null;
};

const readSpawningRoom = (
  spawningWorld: SpawningWorldSnapshot,
  roomName: string,
): SpawningRoomSnapshot => {
  const spawningRoom = spawningWorld.rooms.find(
    (roomSnapshot) => roomSnapshot.roomName === roomName,
  );

  if (spawningRoom === undefined) {
    throw new Error(`Spawning room "${roomName}" is missing from the spawning world snapshot.`);
  }

  return spawningRoom;
};

const classifySpawnAvailability = (spawnSnapshot: SpawnSnapshot): BootstrapSpawnAvailability => {
  if (spawnSnapshot.isSpawning) {
    return {
      roomName: spawnSnapshot.roomName,
      type: 'spawnAlreadySpawning',
    };
  }

  return {
    roomName: spawnSnapshot.roomName,
    type: 'spawnAvailable',
  };
};

const calculateConstructionBacklogEnergy = (
  spawningRoom: SpawningRoomSnapshot,
  spawningWorld: SpawningWorldSnapshot,
): number => {
  const existingConstructionBacklogEnergy = spawningRoom.constructionSites.reduce(
    (totalBacklogEnergy, constructionSite) => totalBacklogEnergy + constructionSite.remainingWork,
    0,
  );
  const extensionLimit =
    spawningWorld.controllerStructureLimits.extension[spawningRoom.controllerLevel] ?? 0;
  const existingExtensionCount =
    countExtensionStructures(spawningRoom) + countExtensionConstructionSites(spawningRoom);
  const missingExtensionCount = Math.max(extensionLimit - existingExtensionCount, 0);

  return (
    existingConstructionBacklogEnergy +
    missingExtensionCount * spawningWorld.constructionCosts.extension
  );
};

const countExtensionStructures = (spawningRoom: SpawningRoomSnapshot): number =>
  spawningRoom.structures.filter(
    (structureSnapshot) => structureSnapshot.structureType === 'extension',
  ).length;

const countExtensionConstructionSites = (spawningRoom: SpawningRoomSnapshot): number =>
  spawningRoom.constructionSites.filter(
    (constructionSite) => constructionSite.structureType === 'extension',
  ).length;

const selectEarlyWorkerBody = (
  spawnSnapshot: SpawnSnapshot,
  bodyPartCosts: Readonly<Record<SpawnBodyPart, number>>,
): readonly SpawnBodyPart[] | null => {
  for (const workerBody of EARLY_WORKER_BODIES) {
    const workerBodyCost = calculateSpawnBodyCost(workerBody, bodyPartCosts);

    if (
      spawnSnapshot.energyCapacity >= workerBodyCost &&
      spawnSnapshot.availableEnergy >= workerBodyCost
    ) {
      return workerBody;
    }
  }

  return null;
};

const calculateSpawnBodyCost = (
  spawnBody: readonly SpawnBodyPart[],
  bodyPartCosts: Readonly<Record<SpawnBodyPart, number>>,
): number =>
  spawnBody.reduce(
    (totalSpawnBodyCost, spawnBodyPart) => totalSpawnBodyCost + bodyPartCosts[spawnBodyPart],
    0,
  );
