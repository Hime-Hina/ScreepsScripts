export type ConstructionTerrain = 'plain' | 'swamp' | 'wall';

export interface ConstructionPositionSnapshot {
  readonly x: number;
  readonly y: number;
}

export interface ConstructionTerrainSnapshot extends ConstructionPositionSnapshot {
  readonly terrain: ConstructionTerrain;
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
  readonly roomName: string;
  readonly spawnPosition: ConstructionPositionSnapshot;
  readonly structures: readonly ConstructionStructureSnapshot[];
  readonly terrain: readonly ConstructionTerrainSnapshot[];
}

export interface ConstructionWorldSnapshot {
  readonly controllerStructureLimits: Readonly<{
    readonly extension: Readonly<Record<number, number>>;
  }>;
  readonly ownedRooms: readonly ConstructionOwnedRoomSnapshot[];
}

export type ConstructionDecision = CreateConstructionSiteDecision;

export interface CreateConstructionSiteDecision {
  readonly roomName: string;
  readonly structureType: 'extension';
  readonly type: 'createConstructionSite';
  readonly x: number;
  readonly y: number;
}

const NEAR_SPAWN_CANDIDATE_RADIUS = 2;

export const planRoomConstruction = (
  constructionWorld: ConstructionWorldSnapshot,
): readonly ConstructionDecision[] =>
  constructionWorld.ownedRooms.flatMap((ownedRoom) =>
    planRclExtensionSites(ownedRoom, constructionWorld.controllerStructureLimits),
  );

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
  const missingExtensionCount = extensionLimit - existingExtensionCount;

  if (missingExtensionCount <= 0) {
    return [];
  }

  const terrainByPositionKey = new Map(
    ownedRoom.terrain.map((terrainTile) => [serializePosition(terrainTile), terrainTile.terrain]),
  );
  const unavailablePositionKeys = collectUnavailablePositionKeys(ownedRoom);
  const extensionDecisions: ConstructionDecision[] = [];

  for (const candidatePosition of listNearSpawnCandidatePositions(ownedRoom.spawnPosition)) {
    if (extensionDecisions.length >= missingExtensionCount) {
      return extensionDecisions;
    }

    const candidatePositionKey = serializePosition(candidatePosition);

    const candidateTerrain = terrainByPositionKey.get(candidatePositionKey);

    if (candidateTerrain === undefined || candidateTerrain === 'wall') {
      continue;
    }

    if (unavailablePositionKeys.has(candidatePositionKey)) {
      continue;
    }

    extensionDecisions.push({
      roomName: ownedRoom.roomName,
      structureType: 'extension',
      type: 'createConstructionSite',
      x: candidatePosition.x,
      y: candidatePosition.y,
    });
    unavailablePositionKeys.add(candidatePositionKey);
  }

  return extensionDecisions;
};

const countExtensionStructures = (ownedRoom: ConstructionOwnedRoomSnapshot): number =>
  ownedRoom.structures.filter(
    (structureSnapshot) => structureSnapshot.structureType === 'extension',
  ).length;

const countExtensionConstructionSites = (ownedRoom: ConstructionOwnedRoomSnapshot): number =>
  ownedRoom.constructionSites.filter(
    (constructionSiteSnapshot) => constructionSiteSnapshot.structureType === 'extension',
  ).length;

const collectUnavailablePositionKeys = (ownedRoom: ConstructionOwnedRoomSnapshot): Set<string> => {
  const unavailablePositionKeys = new Set<string>([
    serializePosition(ownedRoom.spawnPosition),
    ...ownedRoom.blockedPositions.map((blockedPosition) => serializePosition(blockedPosition)),
    ...ownedRoom.structures.map((structureSnapshot) => serializePosition(structureSnapshot)),
    ...ownedRoom.constructionSites.map((constructionSiteSnapshot) =>
      serializePosition(constructionSiteSnapshot),
    ),
  ]);

  return unavailablePositionKeys;
};

const listNearSpawnCandidatePositions = (
  spawnPosition: ConstructionPositionSnapshot,
): readonly ConstructionPositionSnapshot[] => {
  const candidatePositions: ConstructionPositionSnapshot[] = [];

  for (let spawnRange = 1; spawnRange <= NEAR_SPAWN_CANDIDATE_RADIUS; spawnRange += 1) {
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

const isBuildableRoomInterior = (positionSnapshot: ConstructionPositionSnapshot): boolean =>
  positionSnapshot.x > 0 &&
  positionSnapshot.x < 49 &&
  positionSnapshot.y > 0 &&
  positionSnapshot.y < 49;

const serializePosition = (positionSnapshot: ConstructionPositionSnapshot): string =>
  `${positionSnapshot.x}:${positionSnapshot.y}`;
