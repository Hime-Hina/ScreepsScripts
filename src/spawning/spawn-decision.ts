import {
  BOOTSTRAP_SURVIVAL_WORKER_COUNT,
  classifyBootstrapControllerDowngradeState,
  classifySpawnExtensionEnergyState,
  selectBootstrapWorkerDemand,
} from '../colony/bootstrap-economy';

export type SpawnBodyPart = 'work' | 'carry' | 'move';
export type SpawnCreepRole = 'worker' | 'miner' | 'hauler' | 'builder' | 'upgrader';

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

export interface SpawningWorkerCreepSnapshot {
  readonly role?: SpawnCreepRole;
  readonly ticksToLive: number;
}

export interface SpawningRoomSnapshot {
  readonly constructionSites: readonly SpawningConstructionSiteSnapshot[];
  readonly controllerLevel: number;
  readonly energyStructures: readonly SpawningEnergyStructureSnapshot[];
  readonly roomName: string;
  readonly sourceContainerCount?: number;
  readonly spawningWorkerCount?: number;
  readonly sourceCount: number;
  readonly structures: readonly SpawningStructureSnapshot[];
  readonly ticksToDowngrade: number;
  readonly workerCreepCount: number;
  readonly workerCreeps?: readonly SpawningWorkerCreepSnapshot[];
  readonly workerCreepWorkParts: number;
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
  readonly creepRole?: SpawnCreepRole;
  readonly spawnName: string;
}

const INITIAL_WORKER_BODY = ['work', 'carry', 'move'] as const satisfies readonly SpawnBodyPart[];
// Ordered from most capable to emergency body; demand planning and execution both consume
// the first body affordable by room energy capacity/availability.
const EARLY_WORKER_BODIES = [
  ['work', 'work', 'carry', 'carry', 'carry', 'move', 'move', 'move', 'move'],
  ['work', 'carry', 'carry', 'move', 'move'],
  INITIAL_WORKER_BODY,
] as const satisfies readonly (readonly SpawnBodyPart[])[];

const SURVIVAL_WORKER_REQUEST_PRIORITY = 200;
const MINER_WORKER_REQUEST_PRIORITY = 150;
const HAULER_WORKER_REQUEST_PRIORITY = 145;
const BUILDER_WORKER_REQUEST_PRIORITY = 120;
const UPGRADER_WORKER_REQUEST_PRIORITY = 110;
const DEVELOPMENT_WORKER_REQUEST_PRIORITY = 100;
const WORKER_REPLACEMENT_TTL_THRESHOLD = 300;

export type SpawnRequestType =
  | 'survivalWorker'
  | 'minerWorker'
  | 'haulerWorker'
  | 'builderWorker'
  | 'upgraderWorker'
  | 'developmentWorker';

export interface SpawnRequestReasonMetrics {
  readonly constructionBacklogEnergy: number;
  readonly controllerDowngradeState: ReturnType<
    typeof classifyBootstrapControllerDowngradeState
  >['type'];
  readonly controllerLevel: number;
  readonly currentWorkerCount: number;
  readonly energyState: ReturnType<typeof classifySpawnExtensionEnergyState>['type'];
  readonly plannedWorkerWorkParts: number;
  readonly replacementTtlThreshold: number;
  readonly replacementWorkerCount: number;
  readonly sourceCount: number;
  readonly spawningWorkerCount: number;
  readonly targetWorkerCount: number;
  readonly workerCreepWorkParts: number;
}

interface WorkerReplacementPressureMetrics {
  readonly replacementTtlThreshold: number;
  readonly replacementWorkerCount: number;
  readonly spawningWorkerCount: number;
}

export interface SpawnRequest {
  readonly bodyOptions: readonly (readonly SpawnBodyPart[])[];
  readonly priority: number;
  readonly reasonMetrics: SpawnRequestReasonMetrics;
  readonly requestType: SpawnRequestType;
  readonly roomName: string;
  readonly spawnName: string;
  readonly targetGap: number;
}

interface IndexedSpawnRequest extends SpawnRequest {
  readonly order: number;
}

const EARLY_WORKER_BODY_CATALOG: Readonly<
  Record<SpawnRequestType, readonly (readonly SpawnBodyPart[])[]>
> = {
  builderWorker: EARLY_WORKER_BODIES,
  developmentWorker: EARLY_WORKER_BODIES,
  haulerWorker: EARLY_WORKER_BODIES,
  minerWorker: EARLY_WORKER_BODIES,
  survivalWorker: EARLY_WORKER_BODIES,
  upgraderWorker: EARLY_WORKER_BODIES,
};

export const selectBootstrapWorkerSpawnRequests = (
  spawningWorld: SpawningWorldSnapshot,
): readonly SpawnRequest[] =>
  createBootstrapWorkerRequests(spawningWorld).map(removeSpawnRequestIndex);

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
    const constructionBacklogEnergy = calculateConstructionBacklogEnergy(
      spawningRoom,
      spawningWorld,
    );
    const controllerDowngradeState = classifyBootstrapControllerDowngradeState({
      roomName: spawningRoom.roomName,
      ticksToDowngrade: spawningRoom.ticksToDowngrade,
    });
    const energyState = classifySpawnExtensionEnergyState(spawningRoom);
    const plannedWorkerWorkParts = countWorkParts(
      selectLargestWorkerBodyForCapacity(
        EARLY_WORKER_BODY_CATALOG.developmentWorker,
        spawnSnapshot.energyCapacity,
        spawningWorld.bodyPartCosts,
      ),
    );
    const workerDemand = selectBootstrapWorkerDemand({
      constructionBacklogEnergy,
      controllerDowngradeState,
      controllerLevel: spawningRoom.controllerLevel,
      energyState,
      plannedWorkerWorkParts,
      sourceCount: spawningRoom.sourceCount,
      workerCreepCount: spawningRoom.workerCreepCount,
      workerCreepWorkParts: spawningRoom.workerCreepWorkParts,
    });
    const { replacementPressureMetrics, targetGap } = calculateWorkerRequestTargetGap({
      spawningRoom,
      targetWorkerCount: workerDemand.targetWorkerCount,
    });

    if (targetGap <= 0) {
      return [];
    }

    const roleSplitRequest = selectRoleSplitRequest({
      constructionBacklogEnergy,
      spawningRoom,
      targetGap,
      workerDemandType: workerDemand.type,
    });

    return [
      createSpawnRequest({
        order,
        reasonMetrics: createSpawnRequestReasonMetrics({
          constructionBacklogEnergy,
          controllerDowngradeState,
          energyState,
          plannedWorkerWorkParts,
          replacementPressureMetrics,
          spawningRoom,
          targetWorkerCount: workerDemand.targetWorkerCount,
        }),
        requestType: roleSplitRequest?.requestType ?? selectSpawnRequestType(workerDemand.type),
        spawnSnapshot,
        targetGap: roleSplitRequest?.targetGap ?? targetGap,
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

    const { replacementPressureMetrics, targetGap } = calculateWorkerRequestTargetGap({
      spawningRoom,
      targetWorkerCount: BOOTSTRAP_SURVIVAL_WORKER_COUNT,
    });

    return [
      createSpawnRequest({
        order,
        reasonMetrics: createSpawnRequestReasonMetrics({
          constructionBacklogEnergy: 0,
          controllerDowngradeState: classifyBootstrapControllerDowngradeState({
            roomName: spawningRoom.roomName,
            ticksToDowngrade: spawningRoom.ticksToDowngrade,
          }),
          energyState: classifySpawnExtensionEnergyState(spawningRoom),
          plannedWorkerWorkParts: countWorkParts(INITIAL_WORKER_BODY),
          replacementPressureMetrics,
          spawningRoom,
          targetWorkerCount: BOOTSTRAP_SURVIVAL_WORKER_COUNT,
        }),
        requestType: 'survivalWorker',
        spawnSnapshot,
        targetGap,
      }),
    ];
  });

const selectRoleSplitRequest = ({
  constructionBacklogEnergy,
  spawningRoom,
  targetGap,
  workerDemandType,
}: {
  readonly constructionBacklogEnergy: number;
  readonly spawningRoom: SpawningRoomSnapshot;
  readonly targetGap: number;
  readonly workerDemandType: ReturnType<typeof selectBootstrapWorkerDemand>['type'];
}): {
  readonly requestType: SpawnRequestType;
  readonly targetGap: number;
} | null => {
  const sourceContainerCount = readSourceContainerCount(spawningRoom);

  if (
    workerDemandType !== 'rcl2DevelopmentWorkerDemand' ||
    spawningRoom.controllerLevel < 3 ||
    sourceContainerCount < spawningRoom.sourceCount
  ) {
    return null;
  }

  const roleTargets: readonly {
    readonly requestType: SpawnRequestType;
    readonly targetCount: number;
  }[] = [
    {
      requestType: 'minerWorker',
      targetCount: Math.min(spawningRoom.sourceCount, sourceContainerCount),
    },
    {
      requestType: 'haulerWorker',
      targetCount: 1,
    },
    {
      requestType: 'builderWorker',
      targetCount: constructionBacklogEnergy > 0 ? 1 : 0,
    },
    {
      requestType: 'upgraderWorker',
      targetCount: sourceContainerCount > 0 ? 1 : 0,
    },
  ];

  for (const roleTarget of roleTargets) {
    const targetRoleGap = Math.max(
      roleTarget.targetCount -
        countWorkerCreepsByRole(spawningRoom, readSpawnRequestRole(roleTarget.requestType)),
      0,
    );

    if (targetRoleGap > 0) {
      return {
        requestType: roleTarget.requestType,
        targetGap: Math.min(targetGap, targetRoleGap),
      };
    }
  }

  return null;
};

const readSourceContainerCount = (spawningRoom: SpawningRoomSnapshot): number =>
  spawningRoom.sourceContainerCount ?? countStructures(spawningRoom, 'container');

const countWorkerCreepsByRole = (
  spawningRoom: SpawningRoomSnapshot,
  creepRole: SpawnCreepRole,
): number =>
  (spawningRoom.workerCreeps ?? []).filter(
    (workerCreep) => readWorkerCreepRole(workerCreep) === creepRole,
  ).length;

const readWorkerCreepRole = (workerCreep: SpawningWorkerCreepSnapshot): SpawnCreepRole =>
  workerCreep.role ?? 'worker';

const calculateWorkerRequestTargetGap = ({
  spawningRoom,
  targetWorkerCount,
}: {
  readonly spawningRoom: SpawningRoomSnapshot;
  readonly targetWorkerCount: number;
}): {
  readonly replacementPressureMetrics: WorkerReplacementPressureMetrics;
  readonly targetGap: number;
} => {
  const replacementPressureMetrics = calculateWorkerReplacementPressureMetrics(spawningRoom);
  const populationGap = Math.max(targetWorkerCount - spawningRoom.workerCreepCount, 0);
  const populationSurplus = Math.max(spawningRoom.workerCreepCount - targetWorkerCount, 0);
  const replacementGap = Math.max(
    replacementPressureMetrics.replacementWorkerCount -
      replacementPressureMetrics.spawningWorkerCount -
      populationSurplus,
    0,
  );

  return {
    replacementPressureMetrics,
    targetGap: populationGap + replacementGap,
  };
};

const calculateWorkerReplacementPressureMetrics = (
  spawningRoom: SpawningRoomSnapshot,
): WorkerReplacementPressureMetrics => ({
  replacementTtlThreshold: WORKER_REPLACEMENT_TTL_THRESHOLD,
  replacementWorkerCount: (spawningRoom.workerCreeps ?? []).filter(
    (workerCreep) => workerCreep.ticksToLive < WORKER_REPLACEMENT_TTL_THRESHOLD,
  ).length,
  spawningWorkerCount: spawningRoom.spawningWorkerCount ?? 0,
});

const createSpawnRequestReasonMetrics = ({
  constructionBacklogEnergy,
  controllerDowngradeState,
  energyState,
  plannedWorkerWorkParts,
  replacementPressureMetrics,
  spawningRoom,
  targetWorkerCount,
}: {
  readonly constructionBacklogEnergy: number;
  readonly controllerDowngradeState: ReturnType<typeof classifyBootstrapControllerDowngradeState>;
  readonly energyState: ReturnType<typeof classifySpawnExtensionEnergyState>;
  readonly plannedWorkerWorkParts: number;
  readonly replacementPressureMetrics: WorkerReplacementPressureMetrics;
  readonly spawningRoom: SpawningRoomSnapshot;
  readonly targetWorkerCount: number;
}): SpawnRequestReasonMetrics => ({
  constructionBacklogEnergy,
  controllerDowngradeState: controllerDowngradeState.type,
  controllerLevel: spawningRoom.controllerLevel,
  currentWorkerCount: spawningRoom.workerCreepCount,
  energyState: energyState.type,
  plannedWorkerWorkParts,
  replacementTtlThreshold: replacementPressureMetrics.replacementTtlThreshold,
  replacementWorkerCount: replacementPressureMetrics.replacementWorkerCount,
  sourceCount: spawningRoom.sourceCount,
  spawningWorkerCount: replacementPressureMetrics.spawningWorkerCount,
  targetWorkerCount,
  workerCreepWorkParts: spawningRoom.workerCreepWorkParts,
});

const createSpawnRequest = ({
  order,
  reasonMetrics,
  requestType,
  spawnSnapshot,
  targetGap,
}: {
  readonly order: number;
  readonly reasonMetrics: SpawnRequestReasonMetrics;
  readonly requestType: SpawnRequestType;
  readonly spawnSnapshot: SpawnSnapshot;
  readonly targetGap: number;
}): IndexedSpawnRequest => ({
  bodyOptions: EARLY_WORKER_BODY_CATALOG[requestType],
  order,
  priority: readSpawnRequestPriority(requestType),
  reasonMetrics,
  requestType,
  roomName: spawnSnapshot.roomName,
  spawnName: spawnSnapshot.name,
  targetGap,
});

const removeSpawnRequestIndex = (indexedSpawnRequest: IndexedSpawnRequest): SpawnRequest => {
  const { order: _order, ...spawnRequest } = indexedSpawnRequest;

  return spawnRequest;
};

const selectSpawnRequestType = (
  workerDemandType: ReturnType<typeof selectBootstrapWorkerDemand>['type'],
): SpawnRequestType =>
  workerDemandType === 'survivalWorkerDemand' ? 'survivalWorker' : 'developmentWorker';

const readSpawnRequestPriority = (requestType: SpawnRequestType): number => {
  switch (requestType) {
    case 'survivalWorker':
      return SURVIVAL_WORKER_REQUEST_PRIORITY;

    case 'minerWorker':
      return MINER_WORKER_REQUEST_PRIORITY;

    case 'haulerWorker':
      return HAULER_WORKER_REQUEST_PRIORITY;

    case 'builderWorker':
      return BUILDER_WORKER_REQUEST_PRIORITY;

    case 'upgraderWorker':
      return UPGRADER_WORKER_REQUEST_PRIORITY;

    case 'developmentWorker':
      return DEVELOPMENT_WORKER_REQUEST_PRIORITY;
  }
};

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
      compareSpawnRequestPriority(spawnRequest, selectedExecutableRequest.spawnRequest) < 0
    ) {
      selectedExecutableRequest = {
        body: workerBody,
        spawnRequest,
      };
    }
  }

  return selectedExecutableRequest;
};

const compareSpawnRequestPriority = (
  leftSpawnRequest: IndexedSpawnRequest,
  rightSpawnRequest: IndexedSpawnRequest,
): number =>
  compareDescending(leftSpawnRequest.priority, rightSpawnRequest.priority) ||
  compareSpawnRequestType(leftSpawnRequest.requestType, rightSpawnRequest.requestType) ||
  compareDescending(leftSpawnRequest.targetGap, rightSpawnRequest.targetGap) ||
  compareAscending(leftSpawnRequest.order, rightSpawnRequest.order) ||
  leftSpawnRequest.roomName.localeCompare(rightSpawnRequest.roomName) ||
  leftSpawnRequest.spawnName.localeCompare(rightSpawnRequest.spawnName);

const SPAWN_REQUEST_TYPE_ORDER: Readonly<Record<SpawnRequestType, number>> = {
  survivalWorker: 0,
  minerWorker: 1,
  haulerWorker: 2,
  builderWorker: 3,
  upgraderWorker: 4,
  developmentWorker: 5,
};

const compareSpawnRequestType = (
  leftRequestType: SpawnRequestType,
  rightRequestType: SpawnRequestType,
): number =>
  compareAscending(
    SPAWN_REQUEST_TYPE_ORDER[leftRequestType],
    SPAWN_REQUEST_TYPE_ORDER[rightRequestType],
  );

const compareAscending = (leftValue: number, rightValue: number): number => leftValue - rightValue;

const compareDescending = (leftValue: number, rightValue: number): number => rightValue - leftValue;

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

  const creepRole = readSpawnRequestRole(executableSpawnRequest.spawnRequest.requestType);

  return {
    body: executableSpawnRequest.body,
    creepName: `${executableSpawnRequest.spawnRequest.spawnName}-${creepRole}-${gameTime}`,
    ...(creepRole === 'worker' ? {} : { creepRole }),
    spawnName: executableSpawnRequest.spawnRequest.spawnName,
  };
};

const readSpawnRequestRole = (requestType: SpawnRequestType): SpawnCreepRole => {
  switch (requestType) {
    case 'survivalWorker':
    case 'developmentWorker':
      return 'worker';

    case 'minerWorker':
      return 'miner';

    case 'haulerWorker':
      return 'hauler';

    case 'builderWorker':
      return 'builder';

    case 'upgraderWorker':
      return 'upgrader';
  }
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
    countStructures(spawningRoom, 'extension') + countExtensionConstructionSites(spawningRoom);
  const missingExtensionCount = Math.max(extensionLimit - existingExtensionCount, 0);

  return (
    existingConstructionBacklogEnergy +
    missingExtensionCount * spawningWorld.constructionCosts.extension
  );
};

const countStructures = (spawningRoom: SpawningRoomSnapshot, structureType: string): number =>
  spawningRoom.structures.filter(
    (structureSnapshot) => structureSnapshot.structureType === structureType,
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

const selectLargestWorkerBodyForCapacity = (
  bodyOptions: readonly (readonly SpawnBodyPart[])[],
  energyCapacity: number,
  bodyPartCosts: Readonly<Record<SpawnBodyPart, number>>,
): readonly SpawnBodyPart[] => {
  for (const workerBody of bodyOptions) {
    if (energyCapacity >= calculateSpawnBodyCost(workerBody, bodyPartCosts)) {
      return workerBody;
    }
  }

  return [];
};

const countWorkParts = (spawnBody: readonly SpawnBodyPart[]): number =>
  spawnBody.filter((bodyPart) => bodyPart === 'work').length;

const calculateSpawnBodyCost = (
  spawnBody: readonly SpawnBodyPart[],
  bodyPartCosts: Readonly<Record<SpawnBodyPart, number>>,
): number =>
  spawnBody.reduce(
    (totalSpawnBodyCost, spawnBodyPart) => totalSpawnBodyCost + bodyPartCosts[spawnBodyPart],
    0,
  );
