import { decodeRemoteModuleSet } from './module-set.mjs';

const READ_REQUEST_ATTEMPTS = 3;

export class ScreepsApiError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ScreepsApiError';
  }
}

export const readRemoteModuleSet = async (screepsConfig) => {
  const apiPayload = await readScreepsJsonPayloadWithRetry(buildReadUserCodeUrl(screepsConfig), {
    headers: buildAuthHeaders(screepsConfig),
  });

  return decodeCodeResponse(apiPayload);
};

export const readRoomObjects = async (screepsConfig, shardName, roomName) => {
  const apiPayload = await readScreepsJsonPayloadWithRetry(
    buildRoomObjectsUrl(screepsConfig, shardName, roomName),
    {
      headers: buildAuthHeaders(screepsConfig),
    },
  );

  return decodeRoomObjectsResponse(apiPayload);
};

export const readRoomStatus = async (screepsConfig, shardName, roomName) => {
  const apiPayload = await readScreepsJsonPayloadWithRetry(
    buildRoomStatusUrl(screepsConfig, shardName, roomName),
    {
      headers: buildAuthHeaders(screepsConfig),
    },
  );

  return decodeRoomStatusResponse(apiPayload);
};

export const readRoomTerrainText = async (screepsConfig, shardName, roomName) => {
  const apiPayload = await readScreepsJsonPayloadWithRetry(
    buildRoomTerrainUrl(screepsConfig, shardName, roomName),
    {
      headers: buildAuthHeaders(screepsConfig),
    },
  );

  return decodeRoomTerrainResponse(apiPayload, roomName);
};

const readScreepsJsonPayloadWithRetry = async (requestUrl, requestInit) => {
  for (let attemptNumber = 1; attemptNumber <= READ_REQUEST_ATTEMPTS; attemptNumber += 1) {
    try {
      const response = await fetch(requestUrl, requestInit);

      return await readScreepsJsonResponse(response);
    } catch (caughtError) {
      if (caughtError instanceof ScreepsApiError || attemptNumber === READ_REQUEST_ATTEMPTS) {
        throw caughtError;
      }
    }
  }

  throw new ScreepsApiError('Screeps API read retry loop exited unexpectedly.');
};

export const uploadRemoteModuleSet = async (screepsConfig, moduleSet) => {
  const uploadResponse = await fetch(buildWriteUserCodeUrl(screepsConfig), {
    body: JSON.stringify({
      branch: screepsConfig.branch,
      modules: moduleSet,
    }),
    headers: {
      ...buildAuthHeaders(screepsConfig),
      'Content-Type': 'application/json; charset=utf-8',
    },
    method: 'POST',
  });

  await readScreepsJsonResponse(uploadResponse);
};

export const buildReadUserCodeUrl = (screepsConfig) => {
  const userCodeUrl = new URL(
    '/api/user/code',
    `${screepsConfig.protocol}://${screepsConfig.server}`,
  );

  userCodeUrl.searchParams.set('branch', screepsConfig.branch);

  return userCodeUrl;
};

export const buildWriteUserCodeUrl = (screepsConfig) =>
  new URL('/api/user/code', `${screepsConfig.protocol}://${screepsConfig.server}`);

export const buildRoomObjectsUrl = (screepsConfig, shardName, roomName) =>
  buildGameRoomUrl(screepsConfig, '/api/game/room-objects', shardName, roomName);

export const buildRoomStatusUrl = (screepsConfig, shardName, roomName) =>
  buildGameRoomUrl(screepsConfig, '/api/game/room-status', shardName, roomName);

export const buildRoomTerrainUrl = (screepsConfig, shardName, roomName) =>
  buildGameRoomUrl(screepsConfig, '/api/game/room-terrain', shardName, roomName);

const buildGameRoomUrl = (screepsConfig, apiPath, shardName, roomName) => {
  const gameRoomUrl = new URL(apiPath, `${screepsConfig.protocol}://${screepsConfig.server}`);

  gameRoomUrl.searchParams.set('room', roomName);
  gameRoomUrl.searchParams.set('shard', shardName);

  return gameRoomUrl;
};

const buildAuthHeaders = (screepsConfig) => ({
  'X-Token': screepsConfig.token,
});

const readScreepsJsonResponse = async (response) => {
  let apiPayload;

  try {
    apiPayload = await response.json();
  } catch {
    throw new ScreepsApiError(
      `Screeps API returned non-JSON response with HTTP ${response.status}.`,
    );
  }

  if (!response.ok) {
    throw new ScreepsApiError(`Screeps API request failed with HTTP ${response.status}.`);
  }

  if (!isPlainObject(apiPayload) || apiPayload.ok !== 1) {
    throw new ScreepsApiError('Screeps API response did not include ok=1.');
  }

  return apiPayload;
};

const decodeCodeResponse = (apiPayload) => {
  if (!('modules' in apiPayload)) {
    throw new ScreepsApiError('Screeps API code response did not include modules.');
  }

  return decodeRemoteModuleSet(apiPayload.modules);
};

const decodeRoomObjectsResponse = (apiPayload) => {
  if (!Array.isArray(apiPayload.objects)) {
    throw new ScreepsApiError('Screeps API room objects response did not include objects.');
  }

  return apiPayload.objects;
};

const decodeRoomStatusResponse = (apiPayload) => {
  if (apiPayload.room === null) {
    return 'unknown';
  }

  if (
    !isPlainObject(apiPayload.room) ||
    typeof apiPayload.room.status !== 'string' ||
    apiPayload.room.status.trim() === ''
  ) {
    throw new ScreepsApiError('Screeps API room status response did not include status.');
  }

  return apiPayload.room.status.trim();
};

const decodeRoomTerrainResponse = (apiPayload, roomName) => {
  if (typeof apiPayload.terrain === 'string') {
    return apiPayload.terrain;
  }

  if (!Array.isArray(apiPayload.terrain)) {
    throw new ScreepsApiError('Screeps API room terrain response did not include terrain.');
  }

  const roomTerrainEntry = apiPayload.terrain.find(
    (terrainEntry) =>
      isPlainObject(terrainEntry) &&
      terrainEntry.room === roomName &&
      typeof terrainEntry.terrain === 'string',
  );

  if (roomTerrainEntry === undefined) {
    return decodeSparseRoomTerrain(apiPayload.terrain, roomName);
  }

  return roomTerrainEntry.terrain;
};

const decodeSparseRoomTerrain = (terrainEntries, roomName) => {
  const terrainTiles = Array.from({ length: 2500 }, () => '0');
  let roomTerrainEntryFound = false;

  for (const terrainEntry of terrainEntries) {
    if (!isPlainObject(terrainEntry) || terrainEntry.room !== roomName) {
      continue;
    }

    roomTerrainEntryFound = true;

    if (
      !Number.isInteger(terrainEntry.x) ||
      terrainEntry.x < 0 ||
      terrainEntry.x >= 50 ||
      !Number.isInteger(terrainEntry.y) ||
      terrainEntry.y < 0 ||
      terrainEntry.y >= 50
    ) {
      throw new ScreepsApiError(`Screeps API room terrain response has invalid ${roomName} tile.`);
    }

    if (terrainEntry.type === 'wall') {
      terrainTiles[terrainEntry.y * 50 + terrainEntry.x] = '1';
      continue;
    }

    if (terrainEntry.type === 'swamp') {
      terrainTiles[terrainEntry.y * 50 + terrainEntry.x] = '2';
      continue;
    }

    throw new ScreepsApiError(`Screeps API room terrain response has invalid ${roomName} type.`);
  }

  if (!roomTerrainEntryFound) {
    throw new ScreepsApiError(`Screeps API room terrain response did not include ${roomName}.`);
  }

  return terrainTiles.join('');
};

const isPlainObject = (candidateValue) =>
  typeof candidateValue === 'object' && candidateValue !== null && !Array.isArray(candidateValue);
