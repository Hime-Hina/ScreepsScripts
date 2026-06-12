import { decodeRemoteModuleSet } from './module-set.mjs';

export const SCREEPS_PTR_API_BASE_URL = 'https://screeps.com/ptr/api/';

const READ_REQUEST_ATTEMPTS = 3;

export class ScreepsPtrApiError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ScreepsPtrApiError';
  }
}

export const readPtrRemoteModuleSet = async (ptrConfig) => {
  const apiPayload = await readPtrJsonPayloadWithRetry(buildPtrReadUserCodeUrl(ptrConfig), {
    headers: buildPtrAuthHeaders(ptrConfig),
  });

  return decodePtrCodeResponse(apiPayload);
};

export const readPtrAccountStatus = async (ptrConfig) =>
  readPtrJsonPayloadWithRetry(buildPtrAuthMeUrl(), {
    headers: buildPtrAuthHeaders(ptrConfig),
  });

export const readPtrOverview = async (ptrConfig) =>
  readPtrJsonPayloadWithRetry(buildPtrOverviewUrl(), {
    headers: buildPtrAuthHeaders(ptrConfig),
  });

export const readPtrShardInfo = async (ptrConfig) =>
  readPtrJsonPayloadWithRetry(buildPtrShardInfoUrl(), {
    headers: buildPtrAuthHeaders(ptrConfig),
  });

export const readPtrRoomStatus = async (ptrConfig, shardName, roomName) => {
  const apiPayload = await readPtrJsonPayloadWithRetry(buildPtrRoomStatusUrl(shardName, roomName), {
    headers: buildPtrAuthHeaders(ptrConfig),
  });

  return decodePtrRoomStatusResponse(apiPayload);
};

export const readPtrRoomObjects = async (ptrConfig, shardName, roomName) => {
  const apiPayload = await readPtrJsonPayloadWithRetry(
    buildPtrRoomObjectsUrl(shardName, roomName),
    {
      headers: buildPtrAuthHeaders(ptrConfig),
    },
  );

  return decodePtrRoomObjectsResponse(apiPayload);
};

export const placePtrSpawn = async (ptrConfig, spawnTarget) => {
  const placeSpawnResponse = await fetch(buildPtrPlaceSpawnUrl(), {
    body: JSON.stringify({
      room: spawnTarget.roomName,
      shard: spawnTarget.shardName,
      x: spawnTarget.x,
      y: spawnTarget.y,
      name: spawnTarget.spawnName,
    }),
    headers: {
      ...buildPtrAuthHeaders(ptrConfig),
      'Content-Type': 'application/json; charset=utf-8',
    },
    method: 'POST',
  });
  const apiPayload = await readPtrJsonResponse(placeSpawnResponse);

  return decodePtrPlaceSpawnResponse(apiPayload);
};

export const uploadPtrRemoteModuleSet = async (ptrConfig, moduleSet) => {
  const uploadResponse = await fetch(buildPtrWriteUserCodeUrl(), {
    body: JSON.stringify({
      branch: ptrConfig.branch,
      modules: moduleSet,
    }),
    headers: {
      ...buildPtrAuthHeaders(ptrConfig),
      'Content-Type': 'application/json; charset=utf-8',
    },
    method: 'POST',
  });

  await readPtrJsonResponse(uploadResponse);
};

export const buildPtrReadUserCodeUrl = (ptrConfig) => {
  const userCodeUrl = buildPtrApiUrl('user/code');

  userCodeUrl.searchParams.set('branch', ptrConfig.branch);

  return userCodeUrl;
};

export const buildPtrWriteUserCodeUrl = () => buildPtrApiUrl('user/code');

export const buildPtrAuthMeUrl = () => buildPtrApiUrl('auth/me');

export const buildPtrOverviewUrl = () => {
  const overviewUrl = buildPtrApiUrl('user/overview');

  overviewUrl.searchParams.set('interval', '8');

  return overviewUrl;
};

export const buildPtrShardInfoUrl = () => buildPtrApiUrl('game/shards/info');

export const buildPtrRoomStatusUrl = (shardName, roomName) =>
  buildPtrGameRoomUrl('game/room-status', shardName, roomName);

export const buildPtrRoomObjectsUrl = (shardName, roomName) =>
  buildPtrGameRoomUrl('game/room-objects', shardName, roomName);

export const buildPtrPlaceSpawnUrl = () => buildPtrApiUrl('game/place-spawn');

const buildPtrGameRoomUrl = (endpointPath, shardName, roomName) => {
  const gameRoomUrl = buildPtrApiUrl(endpointPath);

  gameRoomUrl.searchParams.set('room', roomName);
  gameRoomUrl.searchParams.set('shard', shardName);

  return gameRoomUrl;
};

const buildPtrApiUrl = (endpointPath) => new URL(endpointPath, SCREEPS_PTR_API_BASE_URL);

const buildPtrAuthHeaders = (ptrConfig) => ({
  'X-Token': ptrConfig.token,
});

const readPtrJsonPayloadWithRetry = async (requestUrl, requestInit) => {
  for (let attemptNumber = 1; attemptNumber <= READ_REQUEST_ATTEMPTS; attemptNumber += 1) {
    try {
      const apiResponse = await fetch(requestUrl, requestInit);

      return await readPtrJsonResponse(apiResponse);
    } catch (caughtError) {
      if (caughtError instanceof ScreepsPtrApiError || attemptNumber === READ_REQUEST_ATTEMPTS) {
        throw caughtError;
      }
    }
  }

  throw new ScreepsPtrApiError('Screeps PTR API read retry loop exited unexpectedly.');
};

const readPtrJsonResponse = async (response) => {
  let apiPayload;

  try {
    apiPayload = await response.json();
  } catch {
    throw new ScreepsPtrApiError(
      `Screeps PTR API returned non-JSON response with HTTP ${response.status}.`,
    );
  }

  if (!response.ok) {
    throw new ScreepsPtrApiError(`Screeps PTR API request failed with HTTP ${response.status}.`);
  }

  if (!isPlainObject(apiPayload)) {
    throw new ScreepsPtrApiError('Screeps PTR API response did not include ok=1.');
  }

  if (apiPayload.ok !== 1) {
    throw new ScreepsPtrApiError(readPtrApiFailureMessage(apiPayload));
  }

  return apiPayload;
};

const decodePtrCodeResponse = (apiPayload) => {
  if (!('modules' in apiPayload)) {
    throw new ScreepsPtrApiError('Screeps PTR API code response did not include modules.');
  }

  return decodeRemoteModuleSet(apiPayload.modules);
};

const decodePtrRoomStatusResponse = (apiPayload) => {
  if (apiPayload.room === null) {
    return 'unknown';
  }

  if (
    !isPlainObject(apiPayload.room) ||
    typeof apiPayload.room.status !== 'string' ||
    apiPayload.room.status.trim() === ''
  ) {
    throw new ScreepsPtrApiError('Screeps PTR API room status response did not include status.');
  }

  return apiPayload.room.status.trim();
};

const decodePtrRoomObjectsResponse = (apiPayload) => {
  if (!Array.isArray(apiPayload.objects)) {
    throw new ScreepsPtrApiError('Screeps PTR API room objects response did not include objects.');
  }

  return apiPayload.objects;
};

const decodePtrPlaceSpawnResponse = (apiPayload) => ({
  ...(typeof apiPayload.newbie === 'boolean' ? { newbie: apiPayload.newbie } : {}),
});

const readPtrApiFailureMessage = (apiPayload) => {
  if (typeof apiPayload.error === 'string' && apiPayload.error.trim() !== '') {
    return `Screeps PTR API request was rejected: ${apiPayload.error.trim()}.`;
  }

  return 'Screeps PTR API response did not include ok=1.';
};

const isPlainObject = (candidateValue) =>
  typeof candidateValue === 'object' && candidateValue !== null && !Array.isArray(candidateValue);
