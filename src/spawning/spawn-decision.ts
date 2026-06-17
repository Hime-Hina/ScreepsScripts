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

const SURVIVAL_WORKER_REQUEST_PRIORITY = 200;
const RCL2_DEVELOPMENT_WORKER_REQUEST_PRIORITY = 100;

type SpawnRequestType = 'survivalWorker' | 'rcl2DevelopmentWorker';

interface SpawnRequest {
  readonly bodyOptions: readonly (readonly SpawnBodyPart[])[];
  readonly priority: number;
  readonly requestType: SpawnRequestType;
  readonly roomName: string;
  readonly spawnName: string;
}

interface IndexedSpawnRequest extends SpawnRequest {
  readonly order: number;
}

const EARLY_WORKER_BODY_CATALOG: Readonly<
  Record<SpawnRequestType, readonly (readonly SpawnBodyPart[])[]>
> = {
  rcl2DevelopmentWorker: EARLY_WORKER_BODIES,
  survivalWorker: EARLY_WORKER_BODIES,
};

export const planBootstrapWorkerSpawn = (
  spawningWorld: SpawningWorldSnapshot,
): SpawnDecision | null =>
  createSpawnDecision(
    selectHighestPriorityExecutableRequest(
      createBootstrapWorkerRequests(spawningWorld),
      spawningWorld,
    ),
    spawningWorld.gameTime,
  );

export const planBootstrapSurvivalWorkerSpawn = (
  spawningWorld: SpawningWorldSnapshot,
): SpawnDecision | null =>
  createSpawnDecision(
    selectHighestPriorityExecutableRequest(
      createBootstrapSurvivalWorkerRequests(spawningWorld),
      spawningWorld,
    ),
    spawningWorld.gameTime,
  );

const createBootstrapWorkerRequests = (
  spawningWorld: SpawningWorldSnapshot,
): readonly IndexedSpawnRequest[] =>
  spawningWorld.spawns.flatMap((spawnSnapshot, order) => {
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
      return [];
    }

    return [
      createSpawnRequest({
        order,
        requestType: selectSpawnRequestType(workerDemand.type),
        spawnSnapshot,
      }),
    ];
  });

const createBootstrapSurvivalWorkerRequests = (
  spawningWorld: SpawningWorldSnapshot,
): readonly IndexedSpawnRequest[] =>
  spawningWorld.spawns.flatMap((spawnSnapshot, order) => {
    const spawningRoom = readSpawningRoom(spawningWorld, spawnSnapshot.roomName);

    if (spawningRoom.workerCreepCount >= BOOTSTRAP_SURVIVAL_WORKER_COUNT) {
      return [];
    }

    return [
      createSpawnRequest({
        order,
        requestType: 'survivalWorker',
        spawnSnapshot,
      }),
    ];
  });

const createSpawnRequest = ({
  order,
  requestType,
  spawnSnapshot,
}: {
  readonly order: number;
  readonly requestType: SpawnRequestType;
  readonly spawnSnapshot: SpawnSnapshot;
}): IndexedSpawnRequest => ({
  bodyOptions: EARLY_WORKER_BODY_CATALOG[requestType],
  order,
  priority: readSpawnRequestPriority(requestType),
  requestType,
  roomName: spawnSnapshot.roomName,
  spawnName: spawnSnapshot.name,
});

const selectSpawnRequestType = (
  workerDemandType: ReturnType<typeof selectBootstrapWorkerDemand>['type'],
): SpawnRequestType =>
  workerDemandType === 'survivalWorkerDemand' ? 'survivalWorker' : 'rcl2DevelopmentWorker';

const readSpawnRequestPriority = (requestType: SpawnRequestType): number =>
  requestType === 'survivalWorker'
    ? SURVIVAL_WORKER_REQUEST_PRIORITY
    : RCL2_DEVELOPMENT_WORKER_REQUEST_PRIORITY;

const selectHighestPriorityExecutableRequest = (
  spawnRequests: readonly IndexedSpawnRequest[],
  spawningWorld: SpawningWorldSnapshot,
): {
  readonly body: readonly SpawnBodyPart[];
  readonly spawnRequest: IndexedSpawnRequest;
} | null => {
  let selectedExecutableRequest: {
    readonly body: readonly SpawnBodyPart[];
    readonly spawnRequest: IndexedSpawnRequest;
  } | null = null;

  for (const spawnRequest of spawnRequests) {
    const spawnSnapshot = readSpawnSnapshot(spawningWorld, spawnRequest.spawnName);

    if (spawnSnapshot.isSpawning) {
      continue;
    }

    const workerBody = selectSpawnRequestBody(
      spawnRequest.bodyOptions,
      spawnSnapshot,
      spawningWorld.bodyPartCosts,
    );

    if (workerBody === null) {
      continue;
    }

    if (
      selectedExecutableRequest === null ||
      spawnRequest.priority > selectedExecutableRequest.spawnRequest.priority ||
      (spawnRequest.priority === selectedExecutableRequest.spawnRequest.priority &&
        spawnRequest.order < selectedExecutableRequest.spawnRequest.order)
    ) {
      selectedExecutableRequest = {
        body: workerBody,
        spawnRequest,
      };
    }
  }

  return selectedExecutableRequest;
};

const createSpawnDecision = (
  executableSpawnRequest: {
    readonly body: readonly SpawnBodyPart[];
    readonly spawnRequest: IndexedSpawnRequest;
  } | null,
  gameTime: number,
): SpawnDecision | null => {
  if (executableSpawnRequest === null) {
    return null;
  }

  return {
    body: executableSpawnRequest.body,
    creepName: `${executableSpawnRequest.spawnRequest.spawnName}-worker-${gameTime}`,
    spawnName: executableSpawnRequest.spawnRequest.spawnName,
  };
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

const readSpawnSnapshot = (
  spawningWorld: SpawningWorldSnapshot,
  spawnName: string,
): SpawnSnapshot => {
  const spawnSnapshot = spawningWorld.spawns.find(
    (candidateSpawn) => candidateSpawn.name === spawnName,
  );

  if (spawnSnapshot === undefined) {
    throw new Error(`Spawn "${spawnName}" is missing from the spawning world snapshot.`);
  }

  return spawnSnapshot;
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

const selectSpawnRequestBody = (
  bodyOptions: readonly (readonly SpawnBodyPart[])[],
  spawnSnapshot: SpawnSnapshot,
  bodyPartCosts: Readonly<Record<SpawnBodyPart, number>>,
): readonly SpawnBodyPart[] | null => {
  for (const workerBody of bodyOptions) {
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
