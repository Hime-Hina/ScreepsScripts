export class RoomGeometryLayoutError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RoomGeometryLayoutError';
  }
}

const ROOM_SIZE = 50;
const DEFAULT_PADDING = 2;
const ROAD_CONNECTIVITY_NEIGHBORS = [-1, 0, 1];
const WALKABLE_ACCESS_TYPES = new Set([
  'container',
  'creep',
  'energy',
  'mineral',
  'resource',
  'road',
  'rampart',
  'ruin',
  'source',
  'tombstone',
]);
const REFILL_TARGET_TYPES = new Set(['spawn', 'extension', 'tower', 'storage']);
const LAYOUT_BOUNDS_TYPES = new Set([
  'constructionSite',
  'constructedWall',
  'container',
  'extension',
  'rampart',
  'road',
  'spawn',
  'storage',
  'tower',
]);
const TILE_PRIORITY = [
  ['spawn', 'S'],
  ['tower', 'T'],
  ['storage', 'G'],
  ['extension', 'E'],
  ['extension-site', 'e'],
  ['road', 'R'],
  ['road-site', 'r'],
  ['container', 'C'],
  ['rampart', 'P'],
  ['constructedWall', 'W'],
  ['controller', 'c'],
  ['source', 's'],
  ['mineral', 'm'],
];

export const createRoomGeometrySnapshot = ({
  ownedUserId = '',
  padding = DEFAULT_PADDING,
  roomName,
  roomObjects,
  terrainText,
}) => {
  if (typeof roomName !== 'string' || roomName.trim() === '') {
    throw new RoomGeometryLayoutError('Room geometry snapshot requires a non-empty roomName.');
  }

  if (!Array.isArray(roomObjects)) {
    throw new RoomGeometryLayoutError('Room geometry snapshot requires roomObjects array input.');
  }

  if (typeof terrainText !== 'string' || terrainText.length !== ROOM_SIZE * ROOM_SIZE) {
    throw new RoomGeometryLayoutError(
      `Room geometry snapshot requires terrainText length ${ROOM_SIZE * ROOM_SIZE}.`,
    );
  }

  if (!Number.isInteger(padding) || padding < 0 || padding > ROOM_SIZE) {
    throw new RoomGeometryLayoutError(
      'Room geometry snapshot padding must be a non-negative integer.',
    );
  }

  const ownedConstructionSites = roomObjects.filter(
    (roomObject) =>
      readStringField(roomObject, 'type') === 'constructionSite' &&
      objectBelongsToUser(roomObject, ownedUserId),
  );
  const counts = summarizeStructureCounts(roomObjects, ownedUserId);
  const anchors = summarizeAnchors(roomObjects);
  const primarySpawn = selectPrimarySpawn(roomObjects, ownedUserId);
  const refillAccess = summarizeRefillAccess(roomObjects, ownedUserId, terrainText);
  const roadConnectivity = summarizeRoadConnectivity(roomObjects, ownedUserId);
  const constructionBacklog = summarizeConstructionBacklog(ownedConstructionSites);
  const extensionRange = summarizeExtensionRange(roomObjects, ownedUserId, primarySpawn);
  const bounds = selectRenderBounds(roomObjects, anchors, padding);

  return {
    anchors,
    asciiMap: renderRoomGeometryAscii(bounds, roomObjects, terrainText),
    bounds,
    constructionBacklog,
    counts,
    extensionRange,
    refillAccess,
    roadConnectivity,
    roomName,
  };
};

export const formatRoomGeometryReport = (metadata, roomGeometrySnapshot) => {
  const safeMetadata = isPlainObject(metadata) ? metadata : {};
  const counts = roomGeometrySnapshot.counts;

  return [
    [
      '[room-geometry-layout:screeps]',
      `source=${readSafeMetadataText(safeMetadata, 'sourceLabel', 'unknown')}`,
      `branch=${readSafeMetadataText(safeMetadata, 'branch', '-')}`,
      `shard=${readSafeMetadataText(safeMetadata, 'shardName', '-')}`,
      `room=${roomGeometrySnapshot.roomName}`,
      `status=${readSafeMetadataText(safeMetadata, 'status', '-')}`,
      `moduleHash=${readSafeMetadataText(safeMetadata, 'moduleHash', '-')}`,
      `bounds=${formatBounds(roomGeometrySnapshot.bounds)}`,
    ].join(' '),
    'legend: S spawn, T tower, G storage, E extension, e extension site, R road, r road site, C container, P rampart, W constructedWall, c controller, s source, m mineral, # wall, ~ swamp, . open',
    [
      'anchors:',
      `controller=${formatAnchorCoordinate(roomGeometrySnapshot.anchors.controller)}`,
      `sources=${formatAnchorCoordinates(roomGeometrySnapshot.anchors.sources)}`,
      `mineral=${formatAnchorCoordinate(roomGeometrySnapshot.anchors.mineral)}`,
    ].join(' '),
    [
      'metrics:',
      `extensions=${counts.extensions}`,
      `extensionSites=${counts.extensionSites}`,
      `roads=${counts.roads}`,
      `roadSites=${counts.roadSites}`,
      `containers=${counts.containers}`,
      `constructionSites=${counts.constructionSites}`,
      `constructionBacklog=${roomGeometrySnapshot.constructionBacklog.summary}`,
      `refillAccess=${roomGeometrySnapshot.refillAccess.summary}`,
      `roadConnectivity=${roomGeometrySnapshot.roadConnectivity.summary}`,
      `extensionRange=${roomGeometrySnapshot.extensionRange}`,
      `capacityImpact=${counts.extensions * 50}->${(counts.extensions + counts.extensionSites) * 50}`,
    ].join(' '),
    roomGeometrySnapshot.asciiMap,
  ].join('\n');
};

export const normalizeRoomGeometryFixture = (rawFixture) => {
  if (!isPlainObject(rawFixture)) {
    throw new RoomGeometryLayoutError('Room geometry fixture must be a JSON object.');
  }

  const roomName = readRequiredFixtureString(rawFixture, 'roomName');
  const roomObjects = rawFixture.roomObjects;

  if (!Array.isArray(roomObjects)) {
    throw new RoomGeometryLayoutError('Room geometry fixture must include roomObjects array.');
  }

  const terrainText =
    typeof rawFixture.terrainText === 'string'
      ? rawFixture.terrainText
      : decodeTerrainRows(rawFixture.terrainRows);

  return {
    accountId: readOptionalFixtureString(rawFixture, 'accountId'),
    branch: readOptionalFixtureString(rawFixture, 'branch'),
    moduleHash: readOptionalFixtureString(rawFixture, 'moduleHash'),
    roomName,
    roomObjects,
    shardName: readOptionalFixtureString(rawFixture, 'shardName'),
    status: readOptionalFixtureString(rawFixture, 'status'),
    terrainText,
  };
};

const summarizeStructureCounts = (roomObjects, ownedUserId) => {
  let constructionSites = 0;
  let containers = 0;
  let extensionSites = 0;
  let extensions = 0;
  let roads = 0;
  let roadSites = 0;

  for (const roomObject of roomObjects) {
    const structureType = readStructureType(roomObject);

    if (structureType === 'extension' && objectBelongsToUser(roomObject, ownedUserId)) {
      if (readStringField(roomObject, 'type') === 'constructionSite') {
        extensionSites += 1;
        constructionSites += 1;
      } else {
        extensions += 1;
      }
      continue;
    }

    if (structureType === 'road') {
      if (readStringField(roomObject, 'type') === 'constructionSite') {
        roadSites += 1;
        if (objectBelongsToUser(roomObject, ownedUserId)) {
          constructionSites += 1;
        }
      } else {
        roads += 1;
      }
      continue;
    }

    if (structureType === 'container') {
      if (readStringField(roomObject, 'type') === 'constructionSite') {
        if (objectBelongsToUser(roomObject, ownedUserId)) {
          constructionSites += 1;
        }
      } else {
        containers += 1;
      }
      continue;
    }

    if (
      readStringField(roomObject, 'type') === 'constructionSite' &&
      objectBelongsToUser(roomObject, ownedUserId)
    ) {
      constructionSites += 1;
    }
  }

  return {
    constructionSites,
    containers,
    extensionSites,
    extensions,
    roads,
    roadSites,
  };
};

const summarizeAnchors = (roomObjects) => ({
  controller: readFirstCoordinate(roomObjects, 'controller'),
  mineral: readFirstCoordinate(roomObjects, 'mineral'),
  sources: roomObjects
    .filter((roomObject) => readStringField(roomObject, 'type') === 'source')
    .map(readCoordinate)
    .filter((coordinate) => coordinate !== null)
    .sort(compareCoordinates),
});

const summarizeConstructionBacklog = (ownedConstructionSites) => {
  let totalProgress = 0;
  let totalProgressRequired = 0;
  const typeCounts = new Map();

  for (const constructionSite of ownedConstructionSites) {
    totalProgress += readNumberField(constructionSite, 'progress') ?? 0;
    totalProgressRequired += readNumberField(constructionSite, 'progressTotal') ?? 0;

    const structureType = readStructureType(constructionSite);
    typeCounts.set(structureType, (typeCounts.get(structureType) ?? 0) + 1);
  }

  const remainingWork = Math.max(totalProgressRequired - totalProgress, 0);

  return {
    progress: `${totalProgress}/${totalProgressRequired}`,
    remainingWork,
    summary: `sites=${ownedConstructionSites.length} progress=${totalProgress}/${totalProgressRequired} remaining=${remainingWork} byType=${formatTypeCounts(typeCounts)}`,
    typeCounts,
  };
};

const summarizeRefillAccess = (roomObjects, ownedUserId, terrainText) => {
  const refillTargets = roomObjects
    .filter(
      (roomObject) =>
        isRefillAccessTarget(roomObject) && objectBelongsToUser(roomObject, ownedUserId),
    )
    .map((roomObject) => ({
      accessCount: countAccessibleAdjacentPositions(roomObject, roomObjects, terrainText),
      label: formatRefillTargetLabel(roomObject),
    }))
    .sort((leftTarget, rightTarget) =>
      leftTarget.accessCount === rightTarget.accessCount
        ? leftTarget.label.localeCompare(rightTarget.label)
        : leftTarget.accessCount - rightTarget.accessCount,
    );

  if (refillTargets.length === 0) {
    return {
      lowCount: 0,
      min: 0,
      summary: '-',
      targets: [],
      worst: '-',
    };
  }

  const lowAccessTargets = refillTargets.filter((target) => target.accessCount <= 1);
  const worstTarget = refillTargets[0];

  return {
    lowCount: lowAccessTargets.length,
    min: worstTarget.accessCount,
    summary: `min=${worstTarget.accessCount} low=${lowAccessTargets.length}/${refillTargets.length} worst=${worstTarget.label}:${worstTarget.accessCount}`,
    targets: refillTargets,
    worst: `${worstTarget.label}:${worstTarget.accessCount}`,
  };
};

const summarizeRoadConnectivity = (roomObjects, ownedUserId) => {
  const roadPositionKeys = new Set(
    roomObjects
      .filter(
        (roomObject) =>
          readStructureType(roomObject) === 'road' &&
          (readStringField(roomObject, 'type') !== 'constructionSite' ||
            objectBelongsToUser(roomObject, ownedUserId)),
      )
      .flatMap((roomObject) => {
        const coordinate = readCoordinate(roomObject);
        return coordinate === null ? [] : [toPositionKey(coordinate.x, coordinate.y)];
      }),
  );

  if (roadPositionKeys.size === 0) {
    return {
      componentCount: 0,
      largestComponentSize: 0,
      summary: 'components=0 largest=0/0',
      totalTiles: 0,
    };
  }

  const visitedPositionKeys = new Set();
  let componentCount = 0;
  let largestComponentSize = 0;

  for (const roadPositionKey of roadPositionKeys) {
    if (visitedPositionKeys.has(roadPositionKey)) {
      continue;
    }

    componentCount += 1;
    const componentSize = measureRoadComponentSize(
      roadPositionKey,
      roadPositionKeys,
      visitedPositionKeys,
    );
    largestComponentSize = Math.max(largestComponentSize, componentSize);
  }

  return {
    componentCount,
    largestComponentSize,
    summary: `components=${componentCount} largest=${largestComponentSize}/${roadPositionKeys.size}`,
    totalTiles: roadPositionKeys.size,
  };
};

const summarizeExtensionRange = (roomObjects, ownedUserId, primarySpawn) => {
  if (primarySpawn === null) {
    return '-';
  }

  const rangeCounts = new Map();

  for (const roomObject of roomObjects) {
    if (
      readStructureType(roomObject) !== 'extension' ||
      !objectBelongsToUser(roomObject, ownedUserId)
    ) {
      continue;
    }

    const coordinate = readCoordinate(roomObject);

    if (coordinate === null) {
      continue;
    }

    const extensionRange = measureRange(primarySpawn, coordinate);
    rangeCounts.set(extensionRange, (rangeCounts.get(extensionRange) ?? 0) + 1);
  }

  if (rangeCounts.size === 0) {
    return '-';
  }

  return [...rangeCounts.entries()]
    .sort(([leftRange], [rightRange]) => leftRange - rightRange)
    .map(([extensionRange, count]) => `${extensionRange}:${count}`)
    .join(',');
};

const selectRenderBounds = (roomObjects, anchors, padding) => {
  const renderCoordinates = roomObjects
    .filter((roomObject) => LAYOUT_BOUNDS_TYPES.has(readStringField(roomObject, 'type')))
    .map(readCoordinate)
    .filter((coordinate) => coordinate !== null);

  if (renderCoordinates.length === 0) {
    if (anchors.controller !== null) {
      renderCoordinates.push(anchors.controller);
    }
    renderCoordinates.push(...anchors.sources);
    if (anchors.mineral !== null) {
      renderCoordinates.push(anchors.mineral);
    }
  }

  if (renderCoordinates.length === 0) {
    return {
      maxX: 2,
      maxY: 2,
      minX: 0,
      minY: 0,
    };
  }

  const xValues = renderCoordinates.map((coordinate) => coordinate.x);
  const yValues = renderCoordinates.map((coordinate) => coordinate.y);

  return {
    maxX: clampCoordinate(Math.max(...xValues) + padding),
    maxY: clampCoordinate(Math.max(...yValues) + padding),
    minX: clampCoordinate(Math.min(...xValues) - padding),
    minY: clampCoordinate(Math.min(...yValues) - padding),
  };
};

const renderRoomGeometryAscii = (bounds, roomObjects, terrainText) => {
  const symbolByPosition = buildTileSymbolMap(roomObjects);
  const xCoordinates = range(bounds.minX, bounds.maxX);
  const lines = [
    `    ${xCoordinates.map((xCoordinate) => Math.floor(xCoordinate / 10)).join('')}`,
    `    ${xCoordinates.map((xCoordinate) => xCoordinate % 10).join('')}`,
  ];

  for (let yCoordinate = bounds.minY; yCoordinate <= bounds.maxY; yCoordinate += 1) {
    const rowTiles = [];

    for (let xCoordinate = bounds.minX; xCoordinate <= bounds.maxX; xCoordinate += 1) {
      rowTiles.push(
        symbolByPosition.get(toPositionKey(xCoordinate, yCoordinate)) ??
          renderTerrainTile(xCoordinate, yCoordinate, terrainText),
      );
    }

    lines.push(`${String(yCoordinate).padStart(2, '0')}  ${rowTiles.join('')}`);
  }

  return lines.join('\n');
};

const buildTileSymbolMap = (roomObjects) => {
  const objectsByPosition = new Map();

  for (const roomObject of roomObjects) {
    const coordinate = readCoordinate(roomObject);

    if (coordinate === null) {
      continue;
    }

    const positionKey = toPositionKey(coordinate.x, coordinate.y);
    const positionObjects = objectsByPosition.get(positionKey) ?? [];
    positionObjects.push(roomObject);
    objectsByPosition.set(positionKey, positionObjects);
  }

  return new Map(
    [...objectsByPosition.entries()].map(([positionKey, positionObjects]) => [
      positionKey,
      pickTileSymbol(positionObjects),
    ]),
  );
};

const pickTileSymbol = (positionObjects) => {
  for (const [tileType, tileSymbol] of TILE_PRIORITY) {
    if (positionObjects.some((roomObject) => readTileType(roomObject) === tileType)) {
      return tileSymbol;
    }
  }

  return '?';
};

const countAccessibleAdjacentPositions = (targetObject, roomObjects, terrainText) => {
  const coordinate = readCoordinate(targetObject);

  if (coordinate === null) {
    return 0;
  }

  const accessBlockedPositionKeys = collectAccessBlockedPositionKeys(roomObjects);
  let accessCount = 0;

  for (let yCoordinate = coordinate.y - 1; yCoordinate <= coordinate.y + 1; yCoordinate += 1) {
    for (let xCoordinate = coordinate.x - 1; xCoordinate <= coordinate.x + 1; xCoordinate += 1) {
      if (
        (xCoordinate === coordinate.x && yCoordinate === coordinate.y) ||
        xCoordinate <= 0 ||
        xCoordinate >= ROOM_SIZE - 1 ||
        yCoordinate <= 0 ||
        yCoordinate >= ROOM_SIZE - 1
      ) {
        continue;
      }

      if (
        renderTerrainTile(xCoordinate, yCoordinate, terrainText) !== '#' &&
        !accessBlockedPositionKeys.has(toPositionKey(xCoordinate, yCoordinate))
      ) {
        accessCount += 1;
      }
    }
  }

  return accessCount;
};

const collectAccessBlockedPositionKeys = (roomObjects) =>
  new Set(
    roomObjects
      .filter((roomObject) => !isWalkableAccessObject(roomObject))
      .flatMap((roomObject) => {
        const coordinate = readCoordinate(roomObject);
        return coordinate === null ? [] : [toPositionKey(coordinate.x, coordinate.y)];
      }),
  );

const measureRoadComponentSize = (startingPositionKey, roadPositionKeys, visitedPositionKeys) => {
  const pendingPositionKeys = [startingPositionKey];
  let componentSize = 0;

  while (pendingPositionKeys.length > 0) {
    const currentPositionKey = pendingPositionKeys.pop();

    if (currentPositionKey === undefined || visitedPositionKeys.has(currentPositionKey)) {
      continue;
    }

    visitedPositionKeys.add(currentPositionKey);
    componentSize += 1;

    const currentCoordinate = readPositionKey(currentPositionKey);

    for (const yOffset of ROAD_CONNECTIVITY_NEIGHBORS) {
      for (const xOffset of ROAD_CONNECTIVITY_NEIGHBORS) {
        if (xOffset === 0 && yOffset === 0) {
          continue;
        }

        const neighborPositionKey = toPositionKey(
          currentCoordinate.x + xOffset,
          currentCoordinate.y + yOffset,
        );

        if (
          roadPositionKeys.has(neighborPositionKey) &&
          !visitedPositionKeys.has(neighborPositionKey)
        ) {
          pendingPositionKeys.push(neighborPositionKey);
        }
      }
    }
  }

  return componentSize;
};

const selectPrimarySpawn = (roomObjects, ownedUserId) =>
  roomObjects
    .filter(
      (roomObject) =>
        readStringField(roomObject, 'type') === 'spawn' &&
        objectBelongsToUser(roomObject, ownedUserId),
    )
    .map(readCoordinate)
    .filter((coordinate) => coordinate !== null)
    .sort(compareCoordinates)[0] ?? null;

const isRefillAccessTarget = (roomObject) => REFILL_TARGET_TYPES.has(readStructureType(roomObject));

const isWalkableAccessObject = (roomObject) =>
  WALKABLE_ACCESS_TYPES.has(readStructureType(roomObject));

const readTileType = (roomObject) => {
  if (readStringField(roomObject, 'type') !== 'constructionSite') {
    return readStringField(roomObject, 'type');
  }

  const structureType = readStringField(roomObject, 'structureType');

  if (structureType === 'extension') {
    return 'extension-site';
  }

  if (structureType === 'road') {
    return 'road-site';
  }

  return structureType;
};

const readStructureType = (roomObject) =>
  readStringField(roomObject, 'type') === 'constructionSite'
    ? readStringField(roomObject, 'structureType')
    : readStringField(roomObject, 'type');

const readFirstCoordinate = (roomObjects, objectType) =>
  roomObjects
    .filter((roomObject) => readStringField(roomObject, 'type') === objectType)
    .map(readCoordinate)
    .filter((coordinate) => coordinate !== null)
    .sort(compareCoordinates)[0] ?? null;

const readCoordinate = (roomObject) => {
  const xCoordinate = readNumberField(roomObject, 'x');
  const yCoordinate = readNumberField(roomObject, 'y');

  return xCoordinate === null || yCoordinate === null ? null : { x: xCoordinate, y: yCoordinate };
};

const readSafeMetadataText = (metadata, fieldName, fallbackValue) => {
  const metadataValue = metadata[fieldName];
  return typeof metadataValue === 'string' && metadataValue.trim() !== ''
    ? metadataValue.trim()
    : fallbackValue;
};

const readRequiredFixtureString = (rawFixture, fieldName) => {
  const fieldValue = rawFixture[fieldName];

  if (typeof fieldValue !== 'string' || fieldValue.trim() === '') {
    throw new RoomGeometryLayoutError(
      `Room geometry fixture field "${fieldName}" must be a non-empty string.`,
    );
  }

  return fieldValue.trim();
};

const readOptionalFixtureString = (rawFixture, fieldName) => {
  const fieldValue = rawFixture[fieldName];
  return typeof fieldValue === 'string' && fieldValue.trim() !== '' ? fieldValue.trim() : undefined;
};

const decodeTerrainRows = (terrainRows) => {
  if (!Array.isArray(terrainRows) || terrainRows.length !== ROOM_SIZE) {
    throw new RoomGeometryLayoutError(
      `Room geometry fixture must include terrainRows array length ${ROOM_SIZE} when terrainText is omitted.`,
    );
  }

  return terrainRows
    .map((terrainRow, rowIndex) => {
      if (typeof terrainRow !== 'string' || terrainRow.length !== ROOM_SIZE) {
        throw new RoomGeometryLayoutError(
          `Room geometry fixture terrainRows[${rowIndex}] must be a ${ROOM_SIZE}-character string.`,
        );
      }

      return [...terrainRow]
        .map((terrainCharacter) => {
          if (terrainCharacter === '1' || terrainCharacter === '#') {
            return '1';
          }

          if (terrainCharacter === '2' || terrainCharacter === '~') {
            return '2';
          }

          if (terrainCharacter === '0' || terrainCharacter === '.') {
            return '0';
          }

          throw new RoomGeometryLayoutError(
            `Room geometry fixture terrainRows contains unsupported tile "${terrainCharacter}".`,
          );
        })
        .join('');
    })
    .join('');
};

const formatTypeCounts = (typeCounts) => {
  if (typeCounts.size === 0) {
    return '-';
  }

  return [...typeCounts.entries()]
    .sort(([leftType], [rightType]) => leftType.localeCompare(rightType))
    .map(([structureType, count]) => `${structureType}:${count}`)
    .join(',');
};

const formatRefillTargetLabel = (roomObject) => {
  const coordinate = readCoordinate(roomObject);
  return coordinate === null
    ? readStructureType(roomObject)
    : `${readStructureType(roomObject)}@${coordinate.x},${coordinate.y}`;
};

const formatAnchorCoordinate = (coordinate) =>
  coordinate === null ? '-' : `${coordinate.x},${coordinate.y}`;

const formatAnchorCoordinates = (coordinates) =>
  coordinates.length === 0 ? '-' : coordinates.map(formatAnchorCoordinate).join('|');

const formatBounds = (bounds) => `${bounds.minX},${bounds.minY}..${bounds.maxX},${bounds.maxY}`;

const renderTerrainTile = (xCoordinate, yCoordinate, terrainText) => {
  const terrainCode = terrainText[yCoordinate * ROOM_SIZE + xCoordinate];
  if (terrainCode === '1') {
    return '#';
  }

  if (terrainCode === '2') {
    return '~';
  }

  return '.';
};

const measureRange = (leftCoordinate, rightCoordinate) =>
  Math.max(
    Math.abs(leftCoordinate.x - rightCoordinate.x),
    Math.abs(leftCoordinate.y - rightCoordinate.y),
  );

const objectBelongsToUser = (roomObject, userId) => {
  if (userId === '') {
    return true;
  }

  return readStringField(roomObject, 'user') === userId;
};

const readNumberField = (roomObject, fieldName) => {
  if (!isPlainObject(roomObject)) {
    return null;
  }

  const fieldValue = roomObject[fieldName];
  return typeof fieldValue === 'number' && Number.isFinite(fieldValue) ? fieldValue : null;
};

const readStringField = (roomObject, fieldName) => {
  if (!isPlainObject(roomObject)) {
    return '';
  }

  const fieldValue = roomObject[fieldName];
  return typeof fieldValue === 'string' ? fieldValue : '';
};

const compareCoordinates = (leftCoordinate, rightCoordinate) =>
  leftCoordinate.y === rightCoordinate.y
    ? leftCoordinate.x - rightCoordinate.x
    : leftCoordinate.y - rightCoordinate.y;

const range = (minValue, maxValue) =>
  Array.from({ length: maxValue - minValue + 1 }, (_, offset) => minValue + offset);

const clampCoordinate = (coordinate) => Math.min(ROOM_SIZE - 1, Math.max(0, coordinate));

const toPositionKey = (xCoordinate, yCoordinate) => `${xCoordinate},${yCoordinate}`;

const readPositionKey = (positionKey) => {
  const [xCoordinateText, yCoordinateText] = positionKey.split(',');
  return {
    x: Number(xCoordinateText),
    y: Number(yCoordinateText),
  };
};

const isPlainObject = (candidateValue) =>
  typeof candidateValue === 'object' && candidateValue !== null && !Array.isArray(candidateValue);
