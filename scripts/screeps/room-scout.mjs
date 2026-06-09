export class RoomScoutError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RoomScoutError';
  }
}

const ROOM_SIZE = 50;
const TERRAIN_MASK_WALL = 1;
const TERRAIN_MASK_SWAMP = 2;
const MINIMUM_SOURCE_COUNT = 2;
const MINIMUM_SPAWN_COORDINATE = 2;
const MAXIMUM_SPAWN_COORDINATE = 47;
const IMPASSABLE_PATH_COST = Number.POSITIVE_INFINITY;
const STARTING_ROOM_SWAMP_TARGET_PERCENT = 8;
const STARTING_ROOM_SWAMP_CEILING_PERCENT = 15;
const STARTING_ROOM_WALL_TARGET_PERCENT = 40;
const STARTING_ROOM_WALL_CEILING_PERCENT = 45;
const STARTING_ROOM_SOURCE_DISTANCE_TARGET = 22;
const STARTING_ROOM_SOURCE_DISTANCE_CEILING = 25;
const STARTING_ROOM_CONTROLLER_DISTANCE_TARGET = 18;
const STARTING_ROOM_CONTROLLER_DISTANCE_CEILING = 25;
const STARTING_ROOM_SOURCE_IMBALANCE_TARGET = 6;
const STARTING_ROOM_OPEN_5X5_TARGET = 22;
const MARGINAL_STARTING_SCORE_CEILING = 115;
const GOOD_STARTING_SCORE_CEILING = 85;
const EXCELLENT_STARTING_SCORE_CEILING = 65;
const EXCELLENT_STARTING_ROOM_SOURCE_DISTANCE_CEILING = 18;
const EXCELLENT_STARTING_ROOM_CONTROLLER_DISTANCE_CEILING = 18;

const SPAWN_BLOCKING_OBJECT_TYPES = new Set([
  'constructedWall',
  'controller',
  'extension',
  'extractor',
  'factory',
  'keeperLair',
  'lab',
  'link',
  'mineral',
  'nuker',
  'observer',
  'portal',
  'powerBank',
  'powerSpawn',
  'source',
  'spawn',
  'storage',
  'terminal',
  'tower',
  'wall',
]);

export const rankStartingRoomCandidates = (roomSnapshots) => {
  if (!Array.isArray(roomSnapshots) || roomSnapshots.length === 0) {
    throw new RoomScoutError('At least one room snapshot is required.');
  }

  return roomSnapshots
    .map(evaluateStartingRoomCandidate)
    .sort(compareCandidateEvaluations)
    .map((candidateEvaluation, candidateIndex) => ({
      ...candidateEvaluation,
      rank: candidateIndex + 1,
    }));
};

export const parseRoomScoutRequest = (commandArguments) => {
  const requestedRoomNames = new Set();
  let requestedShardName = null;

  for (let argumentIndex = 0; argumentIndex < commandArguments.length; argumentIndex += 1) {
    const commandArgument = commandArguments[argumentIndex];

    if (commandArgument === '--') {
      continue;
    }

    if (commandArgument === '--shard') {
      requestedShardName = readFollowingArgument(commandArguments, argumentIndex, '--shard');
      argumentIndex += 1;
      continue;
    }

    if (commandArgument === '--room') {
      requestedRoomNames.add(readFollowingArgument(commandArguments, argumentIndex, '--room'));
      argumentIndex += 1;
      continue;
    }

    if (commandArgument === '--area') {
      const areaText = readFollowingArgument(commandArguments, argumentIndex, '--area');

      for (const roomName of parseRoomArea(areaText)) {
        requestedRoomNames.add(roomName);
      }

      argumentIndex += 1;
      continue;
    }

    throw new RoomScoutError(`Unknown argument "${commandArgument}".`);
  }

  if (requestedShardName === null) {
    throw new RoomScoutError('Missing --shard <name>.');
  }

  if (requestedRoomNames.size === 0) {
    throw new RoomScoutError('Provide at least one --room <name> or --area <corner>:<corner>.');
  }

  return {
    roomNames: [...requestedRoomNames].sort(compareRoomNames),
    shardName: requestedShardName,
  };
};

export const parseRoomArea = (areaText) => {
  const areaCorners = areaText.split(':');

  if (areaCorners.length !== 2) {
    throw new RoomScoutError('Room area must use <corner>:<corner>, for example W10S20:W19S29.');
  }

  const firstRoomCoordinate = parseRoomName(areaCorners[0]);
  const secondRoomCoordinate = parseRoomName(areaCorners[1]);
  const minimumWorldX = Math.min(firstRoomCoordinate.worldX, secondRoomCoordinate.worldX);
  const maximumWorldX = Math.max(firstRoomCoordinate.worldX, secondRoomCoordinate.worldX);
  const minimumWorldY = Math.min(firstRoomCoordinate.worldY, secondRoomCoordinate.worldY);
  const maximumWorldY = Math.max(firstRoomCoordinate.worldY, secondRoomCoordinate.worldY);
  const roomNames = [];

  for (let worldY = minimumWorldY; worldY <= maximumWorldY; worldY += 1) {
    for (let worldX = minimumWorldX; worldX <= maximumWorldX; worldX += 1) {
      roomNames.push(formatRoomName({ worldX, worldY }));
    }
  }

  return roomNames;
};

export const getCardinalNeighborRoomNames = (roomName) => {
  const roomCoordinate = parseRoomName(roomName);

  return [
    formatRoomName({ worldX: roomCoordinate.worldX - 1, worldY: roomCoordinate.worldY }),
    formatRoomName({ worldX: roomCoordinate.worldX + 1, worldY: roomCoordinate.worldY }),
    formatRoomName({ worldX: roomCoordinate.worldX, worldY: roomCoordinate.worldY - 1 }),
    formatRoomName({ worldX: roomCoordinate.worldX, worldY: roomCoordinate.worldY + 1 }),
  ].sort(compareRoomNames);
};

export const formatStartingRoomScoutReport = (scoutReport) => {
  const reportLines = [
    `[scout:screeps] shard=${scoutReport.shardName} branch=${scoutReport.branch} rooms=${scoutReport.roomCount}`,
    'rank room status suitability accepted sources score spawn sourceDistances controller open5x5 localSwamps7x7 swamp wall pathPenalty terrainPenalty risk riskDetails mineral reasons',
  ];

  for (const candidateEvaluation of scoutReport.candidateEvaluations) {
    reportLines.push(formatCandidateEvaluation(candidateEvaluation));
  }

  const rejectedCandidates = scoutReport.candidateEvaluations.filter(
    (candidateEvaluation) => !candidateEvaluation.accepted,
  );

  if (rejectedCandidates.length > 0) {
    reportLines.push('');
    reportLines.push('Rejected:');

    for (const rejectedCandidate of rejectedCandidates) {
      reportLines.push(
        `- ${rejectedCandidate.roomName}: ${rejectedCandidate.rejectionReasons.join('; ')}`,
      );
    }
  }

  return reportLines.join('\n');
};

export const decodeTerrainString = (terrainText) => {
  if (typeof terrainText !== 'string' || terrainText.length !== ROOM_SIZE * ROOM_SIZE) {
    throw new RoomScoutError('Room terrain must be a 2500-character string.');
  }

  return [...terrainText].map((terrainCharacter) => {
    const terrainMask = Number.parseInt(terrainCharacter, 10);

    if (!Number.isInteger(terrainMask) || terrainMask < 0 || terrainMask > 3) {
      throw new RoomScoutError('Room terrain contains an invalid terrain mask.');
    }

    return terrainMask;
  });
};

const evaluateStartingRoomCandidate = (roomSnapshot) => {
  const controllerObject = findFirstObjectByType(roomSnapshot.objects, 'controller');
  const sourceObjects = findObjectsByType(roomSnapshot.objects, 'source');
  const mineralObject = findFirstObjectByType(roomSnapshot.objects, 'mineral');
  const blockingCoordinateKeys = buildBlockingCoordinateKeys(roomSnapshot.objects);
  const terrainSummary = summarizeTerrain(roomSnapshot.terrain);
  const roomRisk = summarizeRoomRisk(roomSnapshot);
  const rejectionReasons = describeRejectionReasons({
    controllerObject,
    roomSnapshot,
    sourceObjects,
  });
  const bestSpawn = rejectionReasons.length
    ? null
    : findBestSpawnPosition({
        blockingCoordinateKeys,
        controllerPosition: toRoomPosition(controllerObject),
        sourcePositions: sourceObjects.map(toRoomPosition),
        terrainTiles: roomSnapshot.terrain,
      });

  if (bestSpawn === null && rejectionReasons.length === 0) {
    rejectionReasons.push('no plain spawn tile can reach both sources and controller');
  }

  const accepted = rejectionReasons.length === 0;
  const scoreBreakdown = buildStartingScoreBreakdown({
    bestSpawn: accepted ? bestSpawn : null,
    roomRisk,
    terrainSummary,
  });
  const score = scoreBreakdown.totalScore;
  const warningReasons = describeWarningReasons({
    bestSpawn: accepted ? bestSpawn : null,
    roomRisk,
    terrainSummary,
  });

  return {
    accepted,
    bestSpawn: accepted ? bestSpawn : null,
    controller: controllerObject === null ? null : toRoomPosition(controllerObject),
    mineral:
      mineralObject === null
        ? null
        : {
            mineralType:
              typeof mineralObject.mineralType === 'string' ? mineralObject.mineralType : 'unknown',
            ...toRoomPosition(mineralObject),
          },
    rank: 0,
    rejectionReasons,
    risk: roomRisk,
    roomName: roomSnapshot.roomName,
    score,
    scoreBreakdown,
    sourceCount: sourceObjects.length,
    sourcePositions: sourceObjects.map(toRoomPosition),
    startingSuitability: classifyStartingSuitability({
      accepted,
      bestSpawn: accepted ? bestSpawn : null,
      roomRisk,
      score,
      terrainSummary,
    }),
    status: roomSnapshot.status,
    terrain: terrainSummary,
    warningReasons,
  };
};

const compareCandidateEvaluations = (leftCandidate, rightCandidate) => {
  if (leftCandidate.accepted !== rightCandidate.accepted) {
    return leftCandidate.accepted ? -1 : 1;
  }

  if (leftCandidate.score !== null && rightCandidate.score !== null) {
    const scoreDifference = leftCandidate.score - rightCandidate.score;

    if (scoreDifference !== 0) {
      return scoreDifference;
    }
  }

  return compareRoomNames(leftCandidate.roomName, rightCandidate.roomName);
};

const describeRejectionReasons = ({ controllerObject, roomSnapshot, sourceObjects }) => {
  const rejectionReasons = [];

  if (!roomStatusAllowsSpawn(roomSnapshot.status)) {
    rejectionReasons.push(`room status is ${roomSnapshot.status}`);
  }

  if (controllerObject === null) {
    rejectionReasons.push('room has no controller');
  } else {
    const controllerOwnerName = readObjectOwnerName(controllerObject);
    const controllerReservationName = readReservationName(controllerObject);

    if (controllerOwnerName !== null) {
      rejectionReasons.push(`controller is owned by ${controllerOwnerName}`);
    }

    if (controllerReservationName !== null) {
      rejectionReasons.push(`controller is reserved by ${controllerReservationName}`);
    }
  }

  if (sourceObjects.length < MINIMUM_SOURCE_COUNT) {
    rejectionReasons.push('room has fewer than two sources');
  }

  return rejectionReasons;
};

const describeWarningReasons = ({ bestSpawn, roomRisk, terrainSummary }) => {
  const warningReasons = [];

  if (terrainSummary.swampPercent >= STARTING_ROOM_SWAMP_CEILING_PERCENT) {
    warningReasons.push(
      `room swamp ${terrainSummary.swampPercent.toFixed(1)}% exceeds ${STARTING_ROOM_SWAMP_CEILING_PERCENT}% starting-room ceiling`,
    );
  } else if (terrainSummary.swampPercent >= STARTING_ROOM_SWAMP_TARGET_PERCENT) {
    warningReasons.push(
      `room swamp ${terrainSummary.swampPercent.toFixed(1)}% exceeds ${STARTING_ROOM_SWAMP_TARGET_PERCENT}% starting-room target`,
    );
  }

  if (terrainSummary.wallPercent >= STARTING_ROOM_WALL_CEILING_PERCENT) {
    warningReasons.push(
      `room wall ${terrainSummary.wallPercent.toFixed(1)}% exceeds ${STARTING_ROOM_WALL_CEILING_PERCENT}% starting-room ceiling`,
    );
  } else if (terrainSummary.wallPercent >= STARTING_ROOM_WALL_TARGET_PERCENT) {
    warningReasons.push(
      `room wall ${terrainSummary.wallPercent.toFixed(1)}% exceeds ${STARTING_ROOM_WALL_TARGET_PERCENT}% starting-room target`,
    );
  }

  if (bestSpawn !== null) {
    const furthestSourceDistance = Math.max(...bestSpawn.sourceDistances);
    const nearestSourceDistance = Math.min(...bestSpawn.sourceDistances);
    const sourceDistanceImbalance = furthestSourceDistance - nearestSourceDistance;

    if (furthestSourceDistance >= STARTING_ROOM_SOURCE_DISTANCE_CEILING) {
      warningReasons.push(
        `furthest source distance ${furthestSourceDistance} exceeds ${STARTING_ROOM_SOURCE_DISTANCE_CEILING}`,
      );
    }

    if (bestSpawn.controllerDistance >= STARTING_ROOM_CONTROLLER_DISTANCE_CEILING) {
      warningReasons.push(
        `controller distance ${bestSpawn.controllerDistance} exceeds ${STARTING_ROOM_CONTROLLER_DISTANCE_CEILING}`,
      );
    }

    if (sourceDistanceImbalance > STARTING_ROOM_SOURCE_IMBALANCE_TARGET) {
      warningReasons.push(`source distance imbalance is ${sourceDistanceImbalance}`);
    }

    if (bestSpawn.localSwamps7x7 > 0) {
      warningReasons.push(`${bestSpawn.localSwamps7x7} swamp tiles within spawn 7x7`);
    }

    if (bestSpawn.openTiles5x5 < STARTING_ROOM_OPEN_5X5_TARGET) {
      warningReasons.push(`only ${bestSpawn.openTiles5x5} open tiles within spawn 5x5`);
    }
  }

  if (roomRisk.candidateHostileCreeps > 0) {
    warningReasons.push(`${roomRisk.candidateHostileCreeps} creeps currently in room`);
  }

  if (roomRisk.candidateSpawns > 0) {
    warningReasons.push(`${roomRisk.candidateSpawns} spawns currently in room`);
  }

  if (roomRisk.candidateTowers > 0) {
    warningReasons.push(`${roomRisk.candidateTowers} towers currently in room`);
  }

  if (roomRisk.neighborCreeps > 0) {
    warningReasons.push(`${roomRisk.neighborCreeps} neighboring creeps`);
  }

  if (roomRisk.neighborOwnedRooms > 0) {
    warningReasons.push(`${roomRisk.neighborOwnedRooms} owned neighboring rooms`);
  }

  if (roomRisk.neighborReservedRooms > 0) {
    warningReasons.push(`${roomRisk.neighborReservedRooms} reserved neighboring rooms`);
  }

  if (roomRisk.neighborTowers > 0) {
    warningReasons.push(`${roomRisk.neighborTowers} neighboring towers`);
  }

  if (roomRisk.neighborSpawns > 0) {
    warningReasons.push(`${roomRisk.neighborSpawns} neighboring spawns`);
  }

  return warningReasons;
};

const buildStartingScoreBreakdown = ({ bestSpawn, roomRisk, terrainSummary }) => {
  if (bestSpawn === null) {
    return {
      pathPenalty: 0,
      riskPenalty: roomRisk.riskScore,
      spawnPlacementScore: 0,
      terrainPenalty: 0,
      totalScore: null,
    };
  }

  const pathPenalty = scorePathPenalty(bestSpawn);
  const terrainPenalty = scoreTerrainPenalty({ bestSpawn, terrainSummary });
  const totalScore = roundScore(
    bestSpawn.score + pathPenalty + terrainPenalty + roomRisk.riskScore,
  );

  return {
    pathPenalty,
    riskPenalty: roomRisk.riskScore,
    spawnPlacementScore: bestSpawn.score,
    terrainPenalty,
    totalScore,
  };
};

const scorePathPenalty = (bestSpawn) => {
  const furthestSourceDistance = Math.max(...bestSpawn.sourceDistances);
  const nearestSourceDistance = Math.min(...bestSpawn.sourceDistances);
  const sourceDistanceImbalance = furthestSourceDistance - nearestSourceDistance;

  return roundScore(
    Math.max(0, furthestSourceDistance - STARTING_ROOM_SOURCE_DISTANCE_TARGET) * 1.7 +
      Math.max(0, bestSpawn.controllerDistance - STARTING_ROOM_CONTROLLER_DISTANCE_TARGET) * 1.2 +
      Math.max(0, sourceDistanceImbalance - STARTING_ROOM_SOURCE_IMBALANCE_TARGET) * 1.5,
  );
};

const scoreTerrainPenalty = ({ bestSpawn, terrainSummary }) =>
  roundScore(
    scoreSwampPercentPenalty(terrainSummary.swampPercent) +
      scoreWallPercentPenalty(terrainSummary.wallPercent) +
      bestSpawn.localSwamps7x7 * 2 +
      Math.max(0, STARTING_ROOM_OPEN_5X5_TARGET - bestSpawn.openTiles5x5) * 4,
  );

const scoreSwampPercentPenalty = (swampPercent) => {
  if (swampPercent <= STARTING_ROOM_SWAMP_TARGET_PERCENT) {
    return 0;
  }

  const targetToCeilingPercent =
    Math.min(swampPercent, STARTING_ROOM_SWAMP_CEILING_PERCENT) -
    STARTING_ROOM_SWAMP_TARGET_PERCENT;
  const overCeilingPercent = Math.max(0, swampPercent - STARTING_ROOM_SWAMP_CEILING_PERCENT);

  return targetToCeilingPercent * 1.5 + overCeilingPercent * 4 + overCeilingPercent ** 2 * 0.1;
};

const scoreWallPercentPenalty = (wallPercent) => {
  if (wallPercent <= STARTING_ROOM_WALL_TARGET_PERCENT) {
    return 0;
  }

  const targetToCeilingPercent =
    Math.min(wallPercent, STARTING_ROOM_WALL_CEILING_PERCENT) - STARTING_ROOM_WALL_TARGET_PERCENT;
  const overCeilingPercent = Math.max(0, wallPercent - STARTING_ROOM_WALL_CEILING_PERCENT);

  return targetToCeilingPercent + overCeilingPercent * 2;
};

const classifyStartingSuitability = ({ accepted, bestSpawn, roomRisk, score, terrainSummary }) => {
  if (!accepted || bestSpawn === null || score === null) {
    return 'rejected';
  }

  const furthestSourceDistance = Math.max(...bestSpawn.sourceDistances);

  if (
    terrainSummary.swampPercent >= 25 ||
    terrainSummary.wallPercent >= 55 ||
    furthestSourceDistance >= 35 ||
    bestSpawn.controllerDistance >= 35 ||
    roomRisk.riskScore >= 80
  ) {
    return 'poor';
  }

  if (
    score <= EXCELLENT_STARTING_SCORE_CEILING &&
    terrainSummary.swampPercent <= 5 &&
    terrainSummary.wallPercent <= STARTING_ROOM_WALL_TARGET_PERCENT &&
    furthestSourceDistance <= EXCELLENT_STARTING_ROOM_SOURCE_DISTANCE_CEILING &&
    bestSpawn.controllerDistance <= EXCELLENT_STARTING_ROOM_CONTROLLER_DISTANCE_CEILING &&
    roomRisk.riskScore <= 30
  ) {
    return 'excellent';
  }

  if (
    score <= GOOD_STARTING_SCORE_CEILING &&
    terrainSummary.swampPercent <= STARTING_ROOM_SWAMP_CEILING_PERCENT &&
    furthestSourceDistance <= STARTING_ROOM_SOURCE_DISTANCE_CEILING &&
    bestSpawn.controllerDistance <= STARTING_ROOM_CONTROLLER_DISTANCE_CEILING &&
    roomRisk.riskScore <= 45
  ) {
    return 'good';
  }

  if (score <= MARGINAL_STARTING_SCORE_CEILING) {
    return 'marginal';
  }

  return 'poor';
};

const roomStatusAllowsSpawn = (roomStatus) => roomStatus === 'normal' || roomStatus === 'respawn';

const findBestSpawnPosition = ({
  blockingCoordinateKeys,
  controllerPosition,
  sourcePositions,
  terrainTiles,
}) => {
  const sourceDistanceMaps = sourcePositions.map((sourcePosition) =>
    buildDistanceMap({
      blockingCoordinateKeys,
      targetPositions: getAdjacentWalkablePositions({
        blockingCoordinateKeys,
        targetPosition: sourcePosition,
        terrainTiles,
      }),
      terrainTiles,
    }),
  );
  const controllerDistanceMap = buildDistanceMap({
    blockingCoordinateKeys,
    targetPositions: getAdjacentWalkablePositions({
      blockingCoordinateKeys,
      targetPosition: controllerPosition,
      terrainTiles,
    }),
    terrainTiles,
  });
  let bestSpawn = null;

  for (let y = MINIMUM_SPAWN_COORDINATE; y <= MAXIMUM_SPAWN_COORDINATE; y += 1) {
    for (let x = MINIMUM_SPAWN_COORDINATE; x <= MAXIMUM_SPAWN_COORDINATE; x += 1) {
      const spawnCoordinateKey = formatCoordinateKey({ x, y });

      if (
        blockingCoordinateKeys.has(spawnCoordinateKey) ||
        !terrainTileIsPlain(terrainTiles[toTerrainIndex({ x, y })])
      ) {
        continue;
      }

      const spawnTerrainIndex = toTerrainIndex({ x, y });
      const sourceDistances = sourceDistanceMaps.map(
        (sourceDistanceMap) => sourceDistanceMap[spawnTerrainIndex],
      );
      const controllerDistance = controllerDistanceMap[spawnTerrainIndex];

      if (
        sourceDistances.some((sourceDistance) => !Number.isFinite(sourceDistance)) ||
        !Number.isFinite(controllerDistance)
      ) {
        continue;
      }

      const openTiles5x5 = countLocalOpenTiles({
        blockingCoordinateKeys,
        radius: 2,
        terrainTiles,
        centerPosition: { x, y },
      });
      const localSwamps7x7 = countLocalSwampTiles({
        radius: 3,
        terrainTiles,
        centerPosition: { x, y },
      });
      const spawnScore = scoreSpawnPosition({
        controllerDistance,
        localSwamps7x7,
        openTiles5x5,
        sourceDistances,
      });
      const spawnCandidate = {
        controllerDistance,
        localSwamps7x7,
        openTiles5x5,
        position: { x, y },
        score: spawnScore,
        sourceDistances,
      };

      if (spawnIsBetter(spawnCandidate, bestSpawn)) {
        bestSpawn = spawnCandidate;
      }
    }
  }

  return bestSpawn;
};

const spawnIsBetter = (spawnCandidate, currentBestSpawn) => {
  if (currentBestSpawn === null) {
    return true;
  }

  const scoreDifference = spawnCandidate.score - currentBestSpawn.score;

  if (scoreDifference !== 0) {
    return scoreDifference < 0;
  }

  if (spawnCandidate.position.y !== currentBestSpawn.position.y) {
    return spawnCandidate.position.y < currentBestSpawn.position.y;
  }

  return spawnCandidate.position.x < currentBestSpawn.position.x;
};

const scoreSpawnPosition = ({
  controllerDistance,
  localSwamps7x7,
  openTiles5x5,
  sourceDistances,
}) => {
  const sourceDistanceTotal = sourceDistances.reduce(
    (distanceTotal, sourceDistance) => distanceTotal + sourceDistance,
    0,
  );
  const furthestSourceDistance = Math.max(...sourceDistances);

  return roundScore(
    sourceDistanceTotal +
      furthestSourceDistance * 0.5 +
      controllerDistance * 0.4 +
      localSwamps7x7 * 0.75 +
      (25 - openTiles5x5) * 2,
  );
};

const buildDistanceMap = ({ blockingCoordinateKeys, targetPositions, terrainTiles }) => {
  const distanceMap = Array.from({ length: ROOM_SIZE * ROOM_SIZE }, () => IMPASSABLE_PATH_COST);
  const frontierPositions = [];

  for (const targetPosition of targetPositions) {
    const terrainIndex = toTerrainIndex(targetPosition);

    distanceMap[terrainIndex] = 0;
    frontierPositions.push(targetPosition);
  }

  while (frontierPositions.length > 0) {
    frontierPositions.sort(
      (leftPosition, rightPosition) =>
        distanceMap[toTerrainIndex(leftPosition)] - distanceMap[toTerrainIndex(rightPosition)],
    );

    const currentPosition = frontierPositions.shift();
    const currentDistance = distanceMap[toTerrainIndex(currentPosition)];

    for (const adjacentPosition of getAdjacentPositions(currentPosition)) {
      const adjacentCoordinateKey = formatCoordinateKey(adjacentPosition);

      if (
        blockingCoordinateKeys.has(adjacentCoordinateKey) ||
        terrainTileIsWall(terrainTiles[toTerrainIndex(adjacentPosition)])
      ) {
        continue;
      }

      const adjacentIndex = toTerrainIndex(adjacentPosition);
      const movementCost = terrainTileIsSwamp(terrainTiles[adjacentIndex]) ? 5 : 1;
      const candidateDistance = currentDistance + movementCost;

      if (candidateDistance < distanceMap[adjacentIndex]) {
        distanceMap[adjacentIndex] = candidateDistance;
        frontierPositions.push(adjacentPosition);
      }
    }
  }

  return distanceMap;
};

const getAdjacentWalkablePositions = ({ blockingCoordinateKeys, targetPosition, terrainTiles }) =>
  getAdjacentPositions(targetPosition).filter((adjacentPosition) => {
    const adjacentCoordinateKey = formatCoordinateKey(adjacentPosition);

    return (
      !blockingCoordinateKeys.has(adjacentCoordinateKey) &&
      !terrainTileIsWall(terrainTiles[toTerrainIndex(adjacentPosition)])
    );
  });

const getAdjacentPositions = (centerPosition) => {
  const adjacentPositions = [];

  for (let y = centerPosition.y - 1; y <= centerPosition.y + 1; y += 1) {
    for (let x = centerPosition.x - 1; x <= centerPosition.x + 1; x += 1) {
      if (
        (x === centerPosition.x && y === centerPosition.y) ||
        x < 0 ||
        x >= ROOM_SIZE ||
        y < 0 ||
        y >= ROOM_SIZE
      ) {
        continue;
      }

      adjacentPositions.push({ x, y });
    }
  }

  return adjacentPositions;
};

const countLocalOpenTiles = ({ blockingCoordinateKeys, centerPosition, radius, terrainTiles }) => {
  let openTileCount = 0;

  for (let y = centerPosition.y - radius; y <= centerPosition.y + radius; y += 1) {
    for (let x = centerPosition.x - radius; x <= centerPosition.x + radius; x += 1) {
      if (x < 0 || x >= ROOM_SIZE || y < 0 || y >= ROOM_SIZE) {
        continue;
      }

      if (
        !blockingCoordinateKeys.has(formatCoordinateKey({ x, y })) &&
        !terrainTileIsWall(terrainTiles[toTerrainIndex({ x, y })])
      ) {
        openTileCount += 1;
      }
    }
  }

  return openTileCount;
};

const countLocalSwampTiles = ({ centerPosition, radius, terrainTiles }) => {
  let swampTileCount = 0;

  for (let y = centerPosition.y - radius; y <= centerPosition.y + radius; y += 1) {
    for (let x = centerPosition.x - radius; x <= centerPosition.x + radius; x += 1) {
      if (x < 0 || x >= ROOM_SIZE || y < 0 || y >= ROOM_SIZE) {
        continue;
      }

      if (terrainTileIsSwamp(terrainTiles[toTerrainIndex({ x, y })])) {
        swampTileCount += 1;
      }
    }
  }

  return swampTileCount;
};

const summarizeTerrain = (terrainTiles) => {
  assertTerrainShape(terrainTiles);

  const wallTiles = terrainTiles.filter(terrainTileIsWall).length;
  const swampTiles = terrainTiles.filter(
    (terrainTile) => terrainTileIsSwamp(terrainTile) && !terrainTileIsWall(terrainTile),
  ).length;
  const plainTiles = terrainTiles.length - wallTiles - swampTiles;

  return {
    plainPercent: toPercent(plainTiles, terrainTiles.length),
    plainTiles,
    swampPercent: toPercent(swampTiles, terrainTiles.length),
    swampTiles,
    wallPercent: toPercent(wallTiles, terrainTiles.length),
    wallTiles,
  };
};

const summarizeRoomRisk = (roomSnapshot) => {
  const candidateHostileCreeps = countObjectsByType(roomSnapshot.objects, 'creep');
  const candidateTowers = countObjectsByType(roomSnapshot.objects, 'tower');
  const candidateSpawns = countObjectsByType(roomSnapshot.objects, 'spawn');
  let neighborCreeps = 0;
  let neighborOwnedRooms = 0;
  let neighborReservedRooms = 0;
  let neighborSpawns = 0;
  let neighborTowers = 0;

  for (const neighborSnapshot of roomSnapshot.neighborSnapshots) {
    neighborCreeps += countObjectsByType(neighborSnapshot.objects, 'creep');
    neighborSpawns += countObjectsByType(neighborSnapshot.objects, 'spawn');
    neighborTowers += countObjectsByType(neighborSnapshot.objects, 'tower');

    const neighborController = findFirstObjectByType(neighborSnapshot.objects, 'controller');

    if (neighborController !== null && readObjectOwnerName(neighborController) !== null) {
      neighborOwnedRooms += 1;
    }

    if (neighborController !== null && readReservationName(neighborController) !== null) {
      neighborReservedRooms += 1;
    }
  }

  return {
    candidateHostileCreeps,
    candidateSpawns,
    candidateTowers,
    neighborCreeps,
    neighborOwnedRooms,
    neighborReservedRooms,
    neighborSpawns,
    neighborTowers,
    riskScore: roundScore(
      candidateHostileCreeps * 8 +
        candidateSpawns * 30 +
        candidateTowers * 20 +
        neighborOwnedRooms * 6 +
        neighborReservedRooms * 3 +
        neighborSpawns * 4 +
        neighborTowers * 2 +
        neighborCreeps,
    ),
  };
};

const formatCandidateEvaluation = (candidateEvaluation) => {
  const scoreText = candidateEvaluation.score === null ? '-' : candidateEvaluation.score.toFixed(1);
  const spawnText =
    candidateEvaluation.bestSpawn === null
      ? '-'
      : `${candidateEvaluation.bestSpawn.position.x},${candidateEvaluation.bestSpawn.position.y}`;
  const sourceDistanceText =
    candidateEvaluation.bestSpawn === null
      ? '-'
      : candidateEvaluation.bestSpawn.sourceDistances.join('/');
  const controllerDistanceText =
    candidateEvaluation.bestSpawn === null
      ? '-'
      : `${candidateEvaluation.bestSpawn.controllerDistance}`;
  const openTilesText =
    candidateEvaluation.bestSpawn === null ? '-' : `${candidateEvaluation.bestSpawn.openTiles5x5}`;
  const localSwampText =
    candidateEvaluation.bestSpawn === null
      ? '-'
      : `${candidateEvaluation.bestSpawn.localSwamps7x7}`;
  const riskDetailText = formatRiskDetails(candidateEvaluation.risk);
  const mineralText =
    candidateEvaluation.mineral === null ? '-' : candidateEvaluation.mineral.mineralType;
  const reasonText = [
    ...candidateEvaluation.rejectionReasons,
    ...candidateEvaluation.warningReasons,
  ].join('; ');

  return [
    candidateEvaluation.rank,
    candidateEvaluation.roomName,
    candidateEvaluation.status,
    candidateEvaluation.startingSuitability,
    candidateEvaluation.accepted ? 'yes' : 'no',
    candidateEvaluation.sourceCount,
    scoreText,
    spawnText,
    sourceDistanceText,
    controllerDistanceText,
    openTilesText,
    localSwampText,
    `${candidateEvaluation.terrain.swampPercent.toFixed(1)}%`,
    `${candidateEvaluation.terrain.wallPercent.toFixed(1)}%`,
    candidateEvaluation.scoreBreakdown.pathPenalty.toFixed(1),
    candidateEvaluation.scoreBreakdown.terrainPenalty.toFixed(1),
    candidateEvaluation.risk.riskScore.toFixed(1),
    riskDetailText,
    mineralText,
    reasonText === '' ? '-' : JSON.stringify(reasonText),
  ].join(' ');
};

const formatRiskDetails = (roomRisk) =>
  [
    `candidateCreeps=${roomRisk.candidateHostileCreeps}`,
    `candidateSpawns=${roomRisk.candidateSpawns}`,
    `candidateTowers=${roomRisk.candidateTowers}`,
    `neighborOwned=${roomRisk.neighborOwnedRooms}`,
    `neighborReserved=${roomRisk.neighborReservedRooms}`,
    `neighborSpawns=${roomRisk.neighborSpawns}`,
    `neighborTowers=${roomRisk.neighborTowers}`,
    `neighborCreeps=${roomRisk.neighborCreeps}`,
  ].join(',');

const buildBlockingCoordinateKeys = (roomObjects) => {
  const blockingCoordinateKeys = new Set();

  for (const roomObject of roomObjects) {
    if (!objectHasPosition(roomObject) || !SPAWN_BLOCKING_OBJECT_TYPES.has(roomObject.type)) {
      continue;
    }

    blockingCoordinateKeys.add(formatCoordinateKey(roomObject));
  }

  return blockingCoordinateKeys;
};

const findFirstObjectByType = (roomObjects, objectType) =>
  roomObjects.find(
    (roomObject) => roomObject.type === objectType && objectHasPosition(roomObject),
  ) ?? null;

const findObjectsByType = (roomObjects, objectType) =>
  roomObjects.filter(
    (roomObject) => roomObject.type === objectType && objectHasPosition(roomObject),
  );

const countObjectsByType = (roomObjects, objectType) =>
  roomObjects.filter((roomObject) => roomObject.type === objectType).length;

const objectHasPosition = (roomObject) =>
  Number.isInteger(roomObject.x) &&
  roomObject.x >= 0 &&
  roomObject.x < ROOM_SIZE &&
  Number.isInteger(roomObject.y) &&
  roomObject.y >= 0 &&
  roomObject.y < ROOM_SIZE;

const readObjectOwnerName = (roomObject) => {
  if (typeof roomObject.owner === 'string' && roomObject.owner !== '') {
    return roomObject.owner;
  }

  if (
    typeof roomObject.owner === 'object' &&
    roomObject.owner !== null &&
    typeof roomObject.owner.username === 'string' &&
    roomObject.owner.username !== ''
  ) {
    return roomObject.owner.username;
  }

  if (typeof roomObject.user === 'string' && roomObject.user !== '') {
    return roomObject.user;
  }

  return null;
};

const readReservationName = (roomObject) => {
  if (
    typeof roomObject.reservation === 'object' &&
    roomObject.reservation !== null &&
    typeof roomObject.reservation.username === 'string' &&
    roomObject.reservation.username !== ''
  ) {
    return roomObject.reservation.username;
  }

  if (
    typeof roomObject.reservation === 'object' &&
    roomObject.reservation !== null &&
    typeof roomObject.reservation.user === 'string' &&
    roomObject.reservation.user !== ''
  ) {
    return roomObject.reservation.user;
  }

  return null;
};

const parseRoomName = (roomName) => {
  const roomNameMatch = /^(W|E)(\d+)(N|S)(\d+)$/.exec(roomName);

  if (roomNameMatch === null) {
    throw new RoomScoutError(`Invalid room name "${roomName}".`);
  }

  const horizontalDirection = roomNameMatch[1];
  const horizontalCoordinate = Number.parseInt(roomNameMatch[2], 10);
  const verticalDirection = roomNameMatch[3];
  const verticalCoordinate = Number.parseInt(roomNameMatch[4], 10);

  return {
    worldX: horizontalDirection === 'W' ? -horizontalCoordinate - 1 : horizontalCoordinate,
    worldY: verticalDirection === 'N' ? -verticalCoordinate - 1 : verticalCoordinate,
  };
};

const formatRoomName = ({ worldX, worldY }) => {
  const horizontalText = worldX < 0 ? `W${Math.abs(worldX) - 1}` : `E${worldX}`;
  const verticalText = worldY < 0 ? `N${Math.abs(worldY) - 1}` : `S${worldY}`;

  return `${horizontalText}${verticalText}`;
};

const compareRoomNames = (leftRoomName, rightRoomName) => {
  const leftRoomCoordinate = parseRoomName(leftRoomName);
  const rightRoomCoordinate = parseRoomName(rightRoomName);

  if (leftRoomCoordinate.worldX !== rightRoomCoordinate.worldX) {
    return leftRoomCoordinate.worldX - rightRoomCoordinate.worldX;
  }

  return leftRoomCoordinate.worldY - rightRoomCoordinate.worldY;
};

const readFollowingArgument = (commandArguments, argumentIndex, argumentName) => {
  const argumentText = commandArguments[argumentIndex + 1];

  if (argumentText === undefined || argumentText.startsWith('--')) {
    throw new RoomScoutError(`Missing value after ${argumentName}.`);
  }

  return argumentText;
};

const assertTerrainShape = (terrainTiles) => {
  if (!Array.isArray(terrainTiles) || terrainTiles.length !== ROOM_SIZE * ROOM_SIZE) {
    throw new RoomScoutError('Room terrain must contain exactly 2500 tiles.');
  }

  for (const terrainTile of terrainTiles) {
    if (!Number.isInteger(terrainTile) || terrainTile < 0 || terrainTile > 3) {
      throw new RoomScoutError('Room terrain contains an invalid terrain mask.');
    }
  }
};

const terrainTileIsPlain = (terrainTile) => terrainTile === 0;

const terrainTileIsSwamp = (terrainTile) => (terrainTile & TERRAIN_MASK_SWAMP) !== 0;

const terrainTileIsWall = (terrainTile) => (terrainTile & TERRAIN_MASK_WALL) !== 0;

const toRoomPosition = (roomObject) => ({
  x: roomObject.x,
  y: roomObject.y,
});

const toTerrainIndex = (roomPosition) => roomPosition.y * ROOM_SIZE + roomPosition.x;

const formatCoordinateKey = (roomPosition) => `${roomPosition.x},${roomPosition.y}`;

const toPercent = (numerator, denominator) => roundScore((numerator / denominator) * 100);

const roundScore = (scoreValue) => Math.round(scoreValue * 10) / 10;
