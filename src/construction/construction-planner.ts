export type ConstructionTerrain = 'plain' | 'swamp' | 'wall';
export type ConstructionStructureType = 'container' | 'extension' | 'road' | 'storage' | 'tower';

export interface ConstructionPositionSnapshot {
  readonly x: number;
  readonly y: number;
}

export interface ConstructionTerrainSnapshot extends ConstructionPositionSnapshot {
  readonly terrain: ConstructionTerrain;
}

export interface ConstructionSourceSnapshot extends ConstructionPositionSnapshot {
  readonly id: string;
}

export interface ConstructionStructureSnapshot extends ConstructionPositionSnapshot {
  readonly structureType: string;
}

export interface ConstructionSiteSnapshot extends ConstructionPositionSnapshot {
  readonly structureType: string;
}

export interface ConstructionOwnedRoomSnapshot {
  readonly blockedPositions: readonly ConstructionPositionSnapshot[];
  readonly constructionSites: readonly ConstructionSiteSnapshot[];
  readonly controllerLevel: number;
  readonly controllerPosition?: ConstructionPositionSnapshot;
  readonly roomName: string;
  readonly sources?: readonly ConstructionSourceSnapshot[];
  readonly spawnPosition: ConstructionPositionSnapshot;
  readonly structures: readonly ConstructionStructureSnapshot[];
  readonly terrain: readonly ConstructionTerrainSnapshot[];
}

export interface ConstructionWorldSnapshot {
  readonly controllerStructureLimits: Readonly<{
    readonly extension: Readonly<Record<number, number>>;
    readonly storage?: Readonly<Record<number, number>>;
    readonly tower: Readonly<Record<number, number>>;
  }>;
  readonly ownedRooms: readonly ConstructionOwnedRoomSnapshot[];
}

export type ConstructionDecision = CreateConstructionSiteDecision;

export interface CreateConstructionSiteDecision {
  readonly roomName: string;
  readonly structureType: ConstructionStructureType;
  readonly type: 'createConstructionSite';
  readonly x: number;
  readonly y: number;
}

const EARLY_NEAR_SPAWN_CANDIDATE_RADIUS = 2;
const RCL4_NEAR_SPAWN_CANDIDATE_RADIUS = 3;
const MIN_REFILL_ACCESS_POSITION_COUNT = 2;
const MAX_NEW_EXTENSION_SITES_PER_ROOM = 5;
const MAX_NEW_ROAD_SITES_PER_ROOM = 2;
const MAX_ACTIVE_SITE_BACKLOG_FOR_NEW_ROADS = 10;
const ADJACENT_POSITION_OFFSETS = [
  { x: -1, y: -1 },
  { x: 0, y: -1 },
  { x: 1, y: -1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
  { x: -1, y: 1 },
  { x: 0, y: 1 },
  { x: 1, y: 1 },
] as const satisfies readonly ConstructionPositionSnapshot[];

export const planRoomConstruction = (
  constructionWorld: ConstructionWorldSnapshot,
): readonly ConstructionDecision[] =>
  constructionWorld.ownedRooms.flatMap((ownedRoom) =>
    planOwnedRoomConstruction(ownedRoom, constructionWorld.controllerStructureLimits),
  );

const planOwnedRoomConstruction = (
  ownedRoom: ConstructionOwnedRoomSnapshot,
  controllerStructureLimits: ConstructionWorldSnapshot['controllerStructureLimits'],
): readonly ConstructionDecision[] => {
  const storageDecisions = planRclStorageSite(ownedRoom, controllerStructureLimits);

  if (storageDecisions.length > 0) {
    return storageDecisions;
  }

  const extensionDecisions = planRclExtensionSites(ownedRoom, controllerStructureLimits);

  if (extensionDecisions.length > 0) {
    return extensionDecisions;
  }

  const towerDecisions = planRclTowerSite(ownedRoom, controllerStructureLimits);

  if (towerDecisions.length > 0) {
    return towerDecisions;
  }

  return planEarlyLogisticsSites(ownedRoom);
};

const planRclStorageSite = (
  ownedRoom: ConstructionOwnedRoomSnapshot,
  controllerStructureLimits: ConstructionWorldSnapshot['controllerStructureLimits'],
): readonly ConstructionDecision[] => {
  const storageLimit = controllerStructureLimits.storage?.[ownedRoom.controllerLevel] ?? 0;

  if (storageLimit <= 0) {
    return [];
  }

  const existingStorageCount =
    countStructureType(ownedRoom, 'storage') + countConstructionSiteType(ownedRoom, 'storage');

  if (existingStorageCount >= storageLimit) {
    return [];
  }

  const terrainByPositionKey = createTerrainByPositionKey(ownedRoom.terrain);
  const unavailablePositionKeys = collectUnavailablePositionKeys(ownedRoom);
  const accessBlockedPositionKeys = collectAccessBlockedPositionKeys(ownedRoom);
  const refillAccessTargets = [...listRefillAccessTargets(ownedRoom)];
  const controllerCorePosition = ownedRoom.controllerPosition ?? ownedRoom.spawnPosition;
  const storagePosition = [
    ...listNearSpawnCandidatePositions(
      ownedRoom.spawnPosition,
      selectNearSpawnCandidateRadius(ownedRoom.controllerLevel),
    ),
  ]
    .filter((candidatePosition) => isBuildableTile(candidatePosition, terrainByPositionKey))
    .filter(
      (candidatePosition) => !unavailablePositionKeys.has(serializePosition(candidatePosition)),
    )
    .filter((candidatePosition) =>
      preservesRefillAccess({
        accessBlockedPositionKeys,
        candidatePosition,
        refillAccessTargets,
        terrainByPositionKey,
      }),
    )
    .filter((candidatePosition) =>
      hasAccessibleAdjacentPositionAfterBuild({
        accessBlockedPositionKeys,
        candidatePosition,
        terrainByPositionKey,
      }),
    )
    .sort(compareStorageCandidatePositions(ownedRoom.spawnPosition, controllerCorePosition))[0];

  return storagePosition === undefined
    ? []
    : [createConstructionSiteDecision(ownedRoom.roomName, storagePosition, 'storage')];
};

const planRclExtensionSites = (
  ownedRoom: ConstructionOwnedRoomSnapshot,
  controllerStructureLimits: ConstructionWorldSnapshot['controllerStructureLimits'],
): readonly ConstructionDecision[] => {
  const extensionLimit = controllerStructureLimits.extension[ownedRoom.controllerLevel] ?? 0;

  if (extensionLimit <= 0) {
    return [];
  }

  const existingExtensionCount =
    countExtensionStructures(ownedRoom) + countExtensionConstructionSites(ownedRoom);
  const missingExtensionCount = Math.min(
    extensionLimit - existingExtensionCount,
    MAX_NEW_EXTENSION_SITES_PER_ROOM,
  );

  if (missingExtensionCount <= 0) {
    return [];
  }

  const terrainByPositionKey = createTerrainByPositionKey(ownedRoom.terrain);
  const unavailablePositionKeys = collectUnavailablePositionKeys(ownedRoom);
  const accessBlockedPositionKeys = collectAccessBlockedPositionKeys(ownedRoom);
  const refillAccessTargets = [...listRefillAccessTargets(ownedRoom)];
  const extensionDecisions: ConstructionDecision[] = [];

  for (const candidatePosition of listNearSpawnCandidatePositions(
    ownedRoom.spawnPosition,
    selectNearSpawnCandidateRadius(ownedRoom.controllerLevel),
  )) {
    if (extensionDecisions.length >= missingExtensionCount) {
      return extensionDecisions;
    }

    if (!isBuildableTile(candidatePosition, terrainByPositionKey)) {
      continue;
    }

    const candidatePositionKey = serializePosition(candidatePosition);

    if (unavailablePositionKeys.has(candidatePositionKey)) {
      continue;
    }

    if (
      !preservesRefillAccess({
        accessBlockedPositionKeys,
        candidatePosition,
        refillAccessTargets,
        terrainByPositionKey,
      })
    ) {
      continue;
    }

    extensionDecisions.push(
      createConstructionSiteDecision(ownedRoom.roomName, candidatePosition, 'extension'),
    );
    unavailablePositionKeys.add(candidatePositionKey);
    accessBlockedPositionKeys.add(candidatePositionKey);
    refillAccessTargets.push(candidatePosition);
  }

  return extensionDecisions;
};

const planRclTowerSite = (
  ownedRoom: ConstructionOwnedRoomSnapshot,
  controllerStructureLimits: ConstructionWorldSnapshot['controllerStructureLimits'],
): readonly ConstructionDecision[] => {
  const towerLimit = controllerStructureLimits.tower[ownedRoom.controllerLevel] ?? 0;

  if (towerLimit <= 0) {
    return [];
  }

  const existingTowerCount =
    countStructureType(ownedRoom, 'tower') + countConstructionSiteType(ownedRoom, 'tower');

  if (existingTowerCount >= towerLimit) {
    return [];
  }

  const terrainByPositionKey = createTerrainByPositionKey(ownedRoom.terrain);
  const unavailablePositionKeys = collectUnavailablePositionKeys(ownedRoom);
  const controllerCorePosition = ownedRoom.controllerPosition ?? ownedRoom.spawnPosition;
  const towerPosition = [
    ...listNearSpawnCandidatePositions(
      ownedRoom.spawnPosition,
      selectNearSpawnCandidateRadius(ownedRoom.controllerLevel),
    ),
  ]
    .filter((candidatePosition) => isBuildableTile(candidatePosition, terrainByPositionKey))
    .filter(
      (candidatePosition) => !unavailablePositionKeys.has(serializePosition(candidatePosition)),
    )
    .filter((candidatePosition) =>
      preservesRefillAccess({
        accessBlockedPositionKeys: collectAccessBlockedPositionKeys(ownedRoom),
        candidatePosition,
        refillAccessTargets: listRefillAccessTargets(ownedRoom),
        terrainByPositionKey,
      }),
    )
    .sort(compareTowerCandidatePositions(ownedRoom.spawnPosition, controllerCorePosition))[0];

  return towerPosition === undefined
    ? []
    : [createConstructionSiteDecision(ownedRoom.roomName, towerPosition, 'tower')];
};

const planEarlyLogisticsSites = (
  ownedRoom: ConstructionOwnedRoomSnapshot,
): readonly ConstructionDecision[] => {
  if (ownedRoom.controllerLevel < 2) {
    return [];
  }

  const logisticsTargets = listLogisticsTargets(ownedRoom);

  if (logisticsTargets.length === 0) {
    return [];
  }

  const terrainByPositionKey = createTerrainByPositionKey(ownedRoom.terrain);
  const unavailablePositionKeys = collectUnavailablePositionKeys(ownedRoom);
  const anchorPlans = logisticsTargets.flatMap((targetPosition) => {
    const existingAnchorPosition = selectExistingAdjacentAnchorPosition(ownedRoom, targetPosition);

    if (existingAnchorPosition !== null) {
      return [
        {
          anchorPosition: existingAnchorPosition,
          createContainer: false,
        },
      ];
    }

    const plannedAnchorPosition = selectAdjacentAnchorPosition({
      spawnPosition: ownedRoom.spawnPosition,
      targetPosition,
      terrainByPositionKey,
      unavailablePositionKeys,
    });

    if (plannedAnchorPosition === null) {
      return [];
    }

    unavailablePositionKeys.add(serializePosition(plannedAnchorPosition));

    return [
      {
        anchorPosition: plannedAnchorPosition,
        createContainer: true,
      },
    ];
  });
  const anchorPositionKeys = new Set(
    anchorPlans.map((anchorPlan) => serializePosition(anchorPlan.anchorPosition)),
  );
  const containerDecisions = anchorPlans.flatMap((anchorPlan) =>
    anchorPlan.createContainer
      ? [createConstructionSiteDecision(ownedRoom.roomName, anchorPlan.anchorPosition, 'container')]
      : [],
  );
  if (!canPlanLowPriorityRoads(ownedRoom)) {
    return containerDecisions;
  }

  const pathBlockedPositionKeys = collectPathBlockedPositionKeys(ownedRoom);
  const roadDecisions = planRoadDecisions({
    anchorPositionKeys,
    anchorPositions: anchorPlans.map((anchorPlan) => anchorPlan.anchorPosition),
    ownedRoom,
    pathBlockedPositionKeys,
    terrainByPositionKey,
    unavailablePositionKeys,
  });

  return [...containerDecisions, ...limitLowPriorityRoadDecisions(ownedRoom, roadDecisions)];
};

const countExtensionStructures = (ownedRoom: ConstructionOwnedRoomSnapshot): number =>
  countStructureType(ownedRoom, 'extension');

const countExtensionConstructionSites = (ownedRoom: ConstructionOwnedRoomSnapshot): number =>
  countConstructionSiteType(ownedRoom, 'extension');

const countStructureType = (
  ownedRoom: ConstructionOwnedRoomSnapshot,
  structureType: ConstructionStructureType,
): number =>
  ownedRoom.structures.filter(
    (structureSnapshot) => structureSnapshot.structureType === structureType,
  ).length;

const countConstructionSiteType = (
  ownedRoom: ConstructionOwnedRoomSnapshot,
  structureType: ConstructionStructureType,
): number =>
  ownedRoom.constructionSites.filter(
    (constructionSiteSnapshot) => constructionSiteSnapshot.structureType === structureType,
  ).length;

const listLogisticsTargets = (
  ownedRoom: ConstructionOwnedRoomSnapshot,
): readonly ConstructionPositionSnapshot[] => {
  const sourceTargets = [...(ownedRoom.sources ?? [])].sort(
    comparePositionsByDistanceTo(ownedRoom.spawnPosition),
  );

  return ownedRoom.controllerPosition === undefined
    ? sourceTargets
    : [...sourceTargets, ownedRoom.controllerPosition];
};

const selectExistingAdjacentAnchorPosition = (
  ownedRoom: ConstructionOwnedRoomSnapshot,
  targetPosition: ConstructionPositionSnapshot,
): ConstructionPositionSnapshot | null => {
  const existingContainerPositions = [
    ...ownedRoom.structures.filter(
      (structureSnapshot) => structureSnapshot.structureType === 'container',
    ),
    ...ownedRoom.constructionSites.filter(
      (constructionSiteSnapshot) => constructionSiteSnapshot.structureType === 'container',
    ),
  ]
    .filter((positionSnapshot) => isAdjacentPosition(positionSnapshot, targetPosition))
    .sort(comparePositionsByDistanceTo(ownedRoom.spawnPosition));

  return existingContainerPositions[0] ?? null;
};

const selectAdjacentAnchorPosition = ({
  spawnPosition,
  targetPosition,
  terrainByPositionKey,
  unavailablePositionKeys,
}: {
  readonly spawnPosition: ConstructionPositionSnapshot;
  readonly targetPosition: ConstructionPositionSnapshot;
  readonly terrainByPositionKey: ReadonlyMap<string, ConstructionTerrain>;
  readonly unavailablePositionKeys: ReadonlySet<string>;
}): ConstructionPositionSnapshot | null => {
  const adjacentCandidates = listAdjacentCandidatePositions(targetPosition)
    .filter((positionSnapshot) => isBuildableTile(positionSnapshot, terrainByPositionKey))
    .filter((positionSnapshot) => !unavailablePositionKeys.has(serializePosition(positionSnapshot)))
    .sort(comparePositionsByDistanceTo(spawnPosition));

  return adjacentCandidates[0] ?? null;
};

const planRoadDecisions = ({
  anchorPositionKeys,
  anchorPositions,
  ownedRoom,
  pathBlockedPositionKeys,
  terrainByPositionKey,
  unavailablePositionKeys,
}: {
  readonly anchorPositionKeys: ReadonlySet<string>;
  readonly anchorPositions: readonly ConstructionPositionSnapshot[];
  readonly ownedRoom: ConstructionOwnedRoomSnapshot;
  readonly pathBlockedPositionKeys: ReadonlySet<string>;
  readonly terrainByPositionKey: ReadonlyMap<string, ConstructionTerrain>;
  readonly unavailablePositionKeys: ReadonlySet<string>;
}): readonly ConstructionDecision[] => {
  const plannedRoadPositionKeys = new Set<string>();
  const roadDecisions: ConstructionDecision[] = [];

  for (const anchorPosition of anchorPositions) {
    const roadPath = findShortestPath({
      anchorPositionKeys,
      pathBlockedPositionKeys,
      spawnPosition: ownedRoom.spawnPosition,
      targetPosition: anchorPosition,
      terrainByPositionKey,
    });

    for (const roadPosition of roadPath.slice(1, -1).reverse()) {
      const roadPositionKey = serializePosition(roadPosition);

      if (
        plannedRoadPositionKeys.has(roadPositionKey) ||
        unavailablePositionKeys.has(roadPositionKey)
      ) {
        continue;
      }

      roadDecisions.push(createConstructionSiteDecision(ownedRoom.roomName, roadPosition, 'road'));
      plannedRoadPositionKeys.add(roadPositionKey);
    }
  }

  return roadDecisions;
};

const limitLowPriorityRoadDecisions = (
  ownedRoom: ConstructionOwnedRoomSnapshot,
  roadDecisions: readonly ConstructionDecision[],
): readonly ConstructionDecision[] => {
  // Cap low-priority road fan-out so early logistics anchors land before a large road backlog.
  if (!canPlanLowPriorityRoads(ownedRoom)) {
    return [];
  }

  return roadDecisions.slice(0, MAX_NEW_ROAD_SITES_PER_ROOM);
};

const canPlanLowPriorityRoads = (ownedRoom: ConstructionOwnedRoomSnapshot): boolean =>
  ownedRoom.constructionSites.length < MAX_ACTIVE_SITE_BACKLOG_FOR_NEW_ROADS;

const createTerrainByPositionKey = (
  terrainSnapshots: readonly ConstructionTerrainSnapshot[],
): ReadonlyMap<string, ConstructionTerrain> =>
  new Map(
    terrainSnapshots.map((terrainTile) => [serializePosition(terrainTile), terrainTile.terrain]),
  );

const collectUnavailablePositionKeys = (ownedRoom: ConstructionOwnedRoomSnapshot): Set<string> =>
  new Set<string>([
    serializePosition(ownedRoom.spawnPosition),
    ...ownedRoom.blockedPositions.map((blockedPosition) => serializePosition(blockedPosition)),
    ...ownedRoom.structures.map((structureSnapshot) => serializePosition(structureSnapshot)),
    ...ownedRoom.constructionSites.map((constructionSiteSnapshot) =>
      serializePosition(constructionSiteSnapshot),
    ),
  ]);

const collectPathBlockedPositionKeys = (ownedRoom: ConstructionOwnedRoomSnapshot): Set<string> =>
  new Set<string>([
    ...ownedRoom.blockedPositions.map((blockedPosition) => serializePosition(blockedPosition)),
    serializePosition(ownedRoom.spawnPosition),
    ...ownedRoom.structures
      .filter((structureSnapshot) => structureSnapshot.structureType !== 'road')
      .map((structureSnapshot) => serializePosition(structureSnapshot)),
    ...ownedRoom.constructionSites
      .filter((constructionSiteSnapshot) => constructionSiteSnapshot.structureType !== 'road')
      .map((constructionSiteSnapshot) => serializePosition(constructionSiteSnapshot)),
  ]);

const preservesRefillAccess = ({
  accessBlockedPositionKeys,
  candidatePosition,
  refillAccessTargets,
  terrainByPositionKey,
}: {
  readonly accessBlockedPositionKeys: ReadonlySet<string>;
  readonly candidatePosition: ConstructionPositionSnapshot;
  readonly refillAccessTargets: readonly ConstructionPositionSnapshot[];
  readonly terrainByPositionKey: ReadonlyMap<string, ConstructionTerrain>;
}): boolean => {
  const accessBlockedPositionKeysWithCandidate = new Set(accessBlockedPositionKeys);
  accessBlockedPositionKeysWithCandidate.add(serializePosition(candidatePosition));
  const refillAccessTargetsWithCandidate = [...refillAccessTargets, candidatePosition];

  return refillAccessTargetsWithCandidate.every((targetPosition) => {
    const currentAccessCount = countAccessibleAdjacentPositions(
      targetPosition,
      terrainByPositionKey,
      accessBlockedPositionKeys,
    );

    if (currentAccessCount === 0 && !isSamePosition(targetPosition, candidatePosition)) {
      return true;
    }

    const minimumAccessCount = isSamePosition(targetPosition, candidatePosition)
      ? MIN_REFILL_ACCESS_POSITION_COUNT
      : Math.min(MIN_REFILL_ACCESS_POSITION_COUNT, currentAccessCount);

    return (
      countAccessibleAdjacentPositions(
        targetPosition,
        terrainByPositionKey,
        accessBlockedPositionKeysWithCandidate,
      ) >= minimumAccessCount
    );
  });
};

const hasAccessibleAdjacentPositionAfterBuild = ({
  accessBlockedPositionKeys,
  candidatePosition,
  terrainByPositionKey,
}: {
  readonly accessBlockedPositionKeys: ReadonlySet<string>;
  readonly candidatePosition: ConstructionPositionSnapshot;
  readonly terrainByPositionKey: ReadonlyMap<string, ConstructionTerrain>;
}): boolean => {
  const accessBlockedPositionKeysWithCandidate = new Set(accessBlockedPositionKeys);
  accessBlockedPositionKeysWithCandidate.add(serializePosition(candidatePosition));

  return (
    countAccessibleAdjacentPositions(
      candidatePosition,
      terrainByPositionKey,
      accessBlockedPositionKeysWithCandidate,
    ) > 0
  );
};

const listRefillAccessTargets = (
  ownedRoom: ConstructionOwnedRoomSnapshot,
): readonly ConstructionPositionSnapshot[] => [
  ...ownedRoom.structures.filter((structureSnapshot) =>
    isRefillAccessTargetStructure(structureSnapshot.structureType),
  ),
  ...ownedRoom.constructionSites.filter((constructionSiteSnapshot) =>
    isRefillAccessTargetStructure(constructionSiteSnapshot.structureType),
  ),
];

const collectAccessBlockedPositionKeys = (ownedRoom: ConstructionOwnedRoomSnapshot): Set<string> =>
  new Set<string>([
    ...ownedRoom.blockedPositions.map((blockedPosition) => serializePosition(blockedPosition)),
    ...ownedRoom.structures
      .filter((structureSnapshot) => !isWalkableAccessStructure(structureSnapshot.structureType))
      .map((structureSnapshot) => serializePosition(structureSnapshot)),
    ...ownedRoom.constructionSites
      .filter(
        (constructionSiteSnapshot) =>
          !isWalkableAccessStructure(constructionSiteSnapshot.structureType),
      )
      .map((constructionSiteSnapshot) => serializePosition(constructionSiteSnapshot)),
  ]);

const countAccessibleAdjacentPositions = (
  targetPosition: ConstructionPositionSnapshot,
  terrainByPositionKey: ReadonlyMap<string, ConstructionTerrain>,
  accessBlockedPositionKeys: ReadonlySet<string>,
): number =>
  listAdjacentCandidatePositions(targetPosition).filter(
    (adjacentPosition) =>
      isBuildableTile(adjacentPosition, terrainByPositionKey) &&
      !accessBlockedPositionKeys.has(serializePosition(adjacentPosition)),
  ).length;

const isRefillAccessTargetStructure = (structureType: string): boolean =>
  structureType === 'spawn' ||
  structureType === 'extension' ||
  structureType === 'storage' ||
  structureType === 'tower';

const isWalkableAccessStructure = (structureType: string): boolean =>
  structureType === 'road' || structureType === 'rampart';

const isSamePosition = (
  leftPosition: ConstructionPositionSnapshot,
  rightPosition: ConstructionPositionSnapshot,
): boolean => leftPosition.x === rightPosition.x && leftPosition.y === rightPosition.y;

const selectNearSpawnCandidateRadius = (controllerLevel: number): number =>
  controllerLevel >= 4 ? RCL4_NEAR_SPAWN_CANDIDATE_RADIUS : EARLY_NEAR_SPAWN_CANDIDATE_RADIUS;

const listNearSpawnCandidatePositions = (
  spawnPosition: ConstructionPositionSnapshot,
  candidateRadius: number,
): readonly ConstructionPositionSnapshot[] => {
  const candidatePositions: ConstructionPositionSnapshot[] = [];

  for (let spawnRange = 1; spawnRange <= candidateRadius; spawnRange += 1) {
    for (let y = spawnPosition.y - spawnRange; y <= spawnPosition.y + spawnRange; y += 1) {
      for (let x = spawnPosition.x - spawnRange; x <= spawnPosition.x + spawnRange; x += 1) {
        const candidateRange = Math.max(
          Math.abs(x - spawnPosition.x),
          Math.abs(y - spawnPosition.y),
        );

        if (candidateRange !== spawnRange) {
          continue;
        }

        if (!isBuildableRoomInterior({ x, y })) {
          continue;
        }

        candidatePositions.push({ x, y });
      }
    }
  }

  return candidatePositions;
};

const listAdjacentCandidatePositions = (
  centerPosition: ConstructionPositionSnapshot,
): readonly ConstructionPositionSnapshot[] =>
  ADJACENT_POSITION_OFFSETS.map((offset) => ({
    x: centerPosition.x + offset.x,
    y: centerPosition.y + offset.y,
  })).filter(isBuildableRoomInterior);

const isBuildableTile = (
  positionSnapshot: ConstructionPositionSnapshot,
  terrainByPositionKey: ReadonlyMap<string, ConstructionTerrain>,
): boolean => {
  const candidateTerrain = terrainByPositionKey.get(serializePosition(positionSnapshot));

  return candidateTerrain !== undefined && candidateTerrain !== 'wall';
};

const isBuildableRoomInterior = (positionSnapshot: ConstructionPositionSnapshot): boolean =>
  positionSnapshot.x > 0 &&
  positionSnapshot.x < 49 &&
  positionSnapshot.y > 0 &&
  positionSnapshot.y < 49;

const isAdjacentPosition = (
  leftPosition: ConstructionPositionSnapshot,
  rightPosition: ConstructionPositionSnapshot,
): boolean =>
  Math.max(
    Math.abs(leftPosition.x - rightPosition.x),
    Math.abs(leftPosition.y - rightPosition.y),
  ) === 1;

const comparePositionsByDistanceTo =
  (targetPosition: ConstructionPositionSnapshot) =>
  (
    leftPosition: ConstructionPositionSnapshot,
    rightPosition: ConstructionPositionSnapshot,
  ): number => {
    const leftRange = measureRange(leftPosition, targetPosition);
    const rightRange = measureRange(rightPosition, targetPosition);

    if (leftRange !== rightRange) {
      return leftRange - rightRange;
    }

    const leftManhattanDistance = measureManhattanDistance(leftPosition, targetPosition);
    const rightManhattanDistance = measureManhattanDistance(rightPosition, targetPosition);

    if (leftManhattanDistance !== rightManhattanDistance) {
      return leftManhattanDistance - rightManhattanDistance;
    }

    if (leftPosition.y !== rightPosition.y) {
      return leftPosition.y - rightPosition.y;
    }

    return leftPosition.x - rightPosition.x;
  };

const compareStorageCandidatePositions = (
  spawnPosition: ConstructionPositionSnapshot,
  controllerCorePosition: ConstructionPositionSnapshot,
) => {
  const compareByControllerDistance = comparePositionsByDistanceTo(controllerCorePosition);
  const compareBySpawnDistance = comparePositionsByDistanceTo(spawnPosition);

  return (
    leftPosition: ConstructionPositionSnapshot,
    rightPosition: ConstructionPositionSnapshot,
  ): number =>
    compareByControllerDistance(leftPosition, rightPosition) ||
    compareBySpawnDistance(leftPosition, rightPosition);
};

const compareTowerCandidatePositions = (
  spawnPosition: ConstructionPositionSnapshot,
  controllerCorePosition: ConstructionPositionSnapshot,
) => {
  const compareByControllerDistance = comparePositionsByDistanceTo(controllerCorePosition);

  return (
    leftPosition: ConstructionPositionSnapshot,
    rightPosition: ConstructionPositionSnapshot,
  ): number => {
    const leftSpawnRange = measureRange(leftPosition, spawnPosition);
    const rightSpawnRange = measureRange(rightPosition, spawnPosition);

    if (leftSpawnRange !== rightSpawnRange) {
      return leftSpawnRange - rightSpawnRange;
    }

    return compareByControllerDistance(leftPosition, rightPosition);
  };
};

const measureRange = (
  leftPosition: ConstructionPositionSnapshot,
  rightPosition: ConstructionPositionSnapshot,
): number =>
  Math.max(Math.abs(leftPosition.x - rightPosition.x), Math.abs(leftPosition.y - rightPosition.y));

const measureManhattanDistance = (
  leftPosition: ConstructionPositionSnapshot,
  rightPosition: ConstructionPositionSnapshot,
): number =>
  Math.abs(leftPosition.x - rightPosition.x) + Math.abs(leftPosition.y - rightPosition.y);

const findShortestPath = ({
  anchorPositionKeys,
  pathBlockedPositionKeys,
  spawnPosition,
  targetPosition,
  terrainByPositionKey,
}: {
  readonly anchorPositionKeys: ReadonlySet<string>;
  readonly pathBlockedPositionKeys: ReadonlySet<string>;
  readonly spawnPosition: ConstructionPositionSnapshot;
  readonly targetPosition: ConstructionPositionSnapshot;
  readonly terrainByPositionKey: ReadonlyMap<string, ConstructionTerrain>;
}): readonly ConstructionPositionSnapshot[] => {
  const targetPositionKey = serializePosition(targetPosition);
  const spawnPositionKey = serializePosition(spawnPosition);
  const queuedPositionKeys = new Set<string>([spawnPositionKey]);
  const previousPositionKeyByPositionKey = new Map<string, string | null>([
    [spawnPositionKey, null],
  ]);
  const positionByKey = new Map<string, ConstructionPositionSnapshot>([
    [spawnPositionKey, spawnPosition],
  ]);
  const queue: ConstructionPositionSnapshot[] = [spawnPosition];

  while (queue.length > 0) {
    const currentPosition = queue.shift();

    if (currentPosition === undefined) {
      break;
    }

    const currentPositionKey = serializePosition(currentPosition);

    if (currentPositionKey === targetPositionKey) {
      return reconstructPath({
        positionByKey,
        previousPositionKeyByPositionKey,
        targetPositionKey,
      });
    }

    for (const adjacentPosition of [...listAdjacentCandidatePositions(currentPosition)].sort(
      comparePositionsByDistanceTo(targetPosition),
    )) {
      if (!isBuildableTile(adjacentPosition, terrainByPositionKey)) {
        continue;
      }

      const adjacentPositionKey = serializePosition(adjacentPosition);
      const isBlockedByAnchor =
        adjacentPositionKey !== targetPositionKey && anchorPositionKeys.has(adjacentPositionKey);
      const isBlockedByStructure =
        adjacentPositionKey !== targetPositionKey &&
        pathBlockedPositionKeys.has(adjacentPositionKey);

      if (
        isBlockedByAnchor ||
        isBlockedByStructure ||
        queuedPositionKeys.has(adjacentPositionKey)
      ) {
        continue;
      }

      queuedPositionKeys.add(adjacentPositionKey);
      previousPositionKeyByPositionKey.set(adjacentPositionKey, currentPositionKey);
      positionByKey.set(adjacentPositionKey, adjacentPosition);
      queue.push(adjacentPosition);
    }
  }

  return [];
};

const reconstructPath = ({
  positionByKey,
  previousPositionKeyByPositionKey,
  targetPositionKey,
}: {
  readonly positionByKey: ReadonlyMap<string, ConstructionPositionSnapshot>;
  readonly previousPositionKeyByPositionKey: ReadonlyMap<string, string | null>;
  readonly targetPositionKey: string;
}): readonly ConstructionPositionSnapshot[] => {
  const path: ConstructionPositionSnapshot[] = [];
  let currentPositionKey: string | null = targetPositionKey;

  while (currentPositionKey !== null) {
    const positionSnapshot = positionByKey.get(currentPositionKey);

    if (positionSnapshot === undefined) {
      return [];
    }

    path.push(positionSnapshot);
    currentPositionKey = previousPositionKeyByPositionKey.get(currentPositionKey) ?? null;
  }

  path.reverse();

  return path;
};

const createConstructionSiteDecision = (
  roomName: string,
  positionSnapshot: ConstructionPositionSnapshot,
  structureType: ConstructionStructureType,
): CreateConstructionSiteDecision => ({
  roomName,
  structureType,
  type: 'createConstructionSite',
  x: positionSnapshot.x,
  y: positionSnapshot.y,
});

const serializePosition = (positionSnapshot: ConstructionPositionSnapshot): string =>
  `${positionSnapshot.x}:${positionSnapshot.y}`;
