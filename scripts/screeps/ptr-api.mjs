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

  if (!isPlainObject(apiPayload) || apiPayload.ok !== 1) {
    throw new ScreepsPtrApiError('Screeps PTR API response did not include ok=1.');
  }

  return apiPayload;
};

const decodePtrCodeResponse = (apiPayload) => {
  if (!('modules' in apiPayload)) {
    throw new ScreepsPtrApiError('Screeps PTR API code response did not include modules.');
  }

  return decodeRemoteModuleSet(apiPayload.modules);
};

const isPlainObject = (candidateValue) =>
  typeof candidateValue === 'object' && candidateValue !== null && !Array.isArray(candidateValue);
