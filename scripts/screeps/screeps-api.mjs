import { decodeRemoteModuleSet } from './module-set.mjs';

export class ScreepsApiError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ScreepsApiError';
  }
}

export const readRemoteModuleSet = async (screepsConfig) => {
  const response = await fetch(buildReadUserCodeUrl(screepsConfig), {
    headers: buildAuthHeaders(screepsConfig),
  });

  return decodeCodeResponse(await readScreepsJsonResponse(response));
};

export const uploadRemoteModuleSet = async (screepsConfig, moduleSet) => {
  const response = await fetch(buildWriteUserCodeUrl(screepsConfig), {
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

  await readScreepsJsonResponse(response);
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

const isPlainObject = (candidateValue) =>
  typeof candidateValue === 'object' && candidateValue !== null && !Array.isArray(candidateValue);
