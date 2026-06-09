import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const SCREEPS_CONFIG_FILE = 'screeps.json';
export const SCREEPS_CONFIG_PROFILE = 'main';

export class ScreepsConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ScreepsConfigError';
  }
}

export const readMainScreepsConfig = async () => readMainScreepsConfigFrom(process.cwd());

export const readMainScreepsConfigFrom = async (workspacePath) => {
  const configPath = join(workspacePath, SCREEPS_CONFIG_FILE);
  let configText;

  try {
    configText = await readFile(configPath, 'utf8');
  } catch (caughtError) {
    if (isNodeFileSystemError(caughtError) && caughtError.code === 'ENOENT') {
      throw new ScreepsConfigError(
        `Missing ${SCREEPS_CONFIG_FILE}; create it from screeps.example.json.`,
      );
    }

    throw caughtError;
  }

  return decodeMainScreepsConfig(parseScreepsConfigText(configText));
};

export const parseScreepsConfigText = (configText) => {
  try {
    return JSON.parse(configText);
  } catch {
    throw new ScreepsConfigError(`${SCREEPS_CONFIG_FILE} is not valid JSON.`);
  }
};

export const decodeMainScreepsConfig = (rawScreepsConfig) => {
  if (!isPlainObject(rawScreepsConfig)) {
    throw new ScreepsConfigError(`${SCREEPS_CONFIG_FILE} must contain a top-level object.`);
  }

  const mainProfile = rawScreepsConfig[SCREEPS_CONFIG_PROFILE];

  if (!isPlainObject(mainProfile)) {
    throw new ScreepsConfigError(
      `${SCREEPS_CONFIG_FILE} must define a "${SCREEPS_CONFIG_PROFILE}" profile.`,
    );
  }

  const branch = readRequiredString(mainProfile, 'branch');
  const protocol = readProtocol(mainProfile);
  const server = readRequiredString(mainProfile, 'server');
  const token = readRequiredString(mainProfile, 'token');

  if (server.includes('/')) {
    throw new ScreepsConfigError('Screeps server must be a host name without protocol or path.');
  }

  return {
    branch,
    protocol,
    server,
    token,
  };
};

const readProtocol = (configProfile) => {
  const protocol = readRequiredString(configProfile, 'protocol');

  if (protocol !== 'https' && protocol !== 'http') {
    throw new ScreepsConfigError('Screeps protocol must be "https" or "http".');
  }

  return protocol;
};

const readRequiredString = (configProfile, fieldName) => {
  const fieldValue = configProfile[fieldName];

  if (typeof fieldValue !== 'string' || fieldValue.trim() === '') {
    throw new ScreepsConfigError(`Screeps config field "${fieldName}" must be a non-empty string.`);
  }

  return fieldValue.trim();
};

const isPlainObject = (candidateValue) =>
  typeof candidateValue === 'object' && candidateValue !== null && !Array.isArray(candidateValue);

const isNodeFileSystemError = (caughtError) =>
  caughtError instanceof Error && 'code' in caughtError && typeof caughtError.code === 'string';
