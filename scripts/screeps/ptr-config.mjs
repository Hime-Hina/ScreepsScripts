import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const SCREEPS_PTR_CONFIG_FILE = 'screeps.ptr.json';

const SCREEPS_PTR_CONFIG_FIELDS = new Set(['branch', 'token']);

export class ScreepsPtrConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ScreepsPtrConfigError';
  }
}

export const readPtrScreepsConfig = async () => readPtrScreepsConfigFrom(process.cwd());

export const readPtrScreepsConfigFrom = async (workspacePath) => {
  const configPath = join(workspacePath, SCREEPS_PTR_CONFIG_FILE);
  let configText;

  try {
    configText = await readFile(configPath, 'utf8');
  } catch (caughtError) {
    if (isNodeFileSystemError(caughtError) && caughtError.code === 'ENOENT') {
      throw new ScreepsPtrConfigError(
        `Missing ${SCREEPS_PTR_CONFIG_FILE}; create it from screeps.ptr.example.json.`,
      );
    }

    throw caughtError;
  }

  return decodePtrScreepsConfig(parsePtrScreepsConfigText(configText));
};

export const parsePtrScreepsConfigText = (configText) => {
  try {
    return JSON.parse(configText);
  } catch {
    throw new ScreepsPtrConfigError(`${SCREEPS_PTR_CONFIG_FILE} is not valid JSON.`);
  }
};

export const decodePtrScreepsConfig = (rawPtrConfig) => {
  if (!isPlainObject(rawPtrConfig)) {
    throw new ScreepsPtrConfigError(`${SCREEPS_PTR_CONFIG_FILE} must contain a top-level object.`);
  }

  assertPtrConfigFieldSet(rawPtrConfig);

  return {
    branch: readRequiredPtrString(rawPtrConfig, 'branch'),
    token: readRequiredPtrString(rawPtrConfig, 'token'),
  };
};

const assertPtrConfigFieldSet = (rawPtrConfig) => {
  for (const fieldName of Object.keys(rawPtrConfig)) {
    if (!SCREEPS_PTR_CONFIG_FIELDS.has(fieldName)) {
      throw new ScreepsPtrConfigError(
        `PTR config supports only "branch" and "token"; remove unsupported field "${fieldName}".`,
      );
    }
  }
};

const readRequiredPtrString = (configProfile, fieldName) => {
  const fieldValue = configProfile[fieldName];

  if (typeof fieldValue !== 'string' || fieldValue.trim() === '') {
    throw new ScreepsPtrConfigError(`PTR config field "${fieldName}" must be a non-empty string.`);
  }

  return fieldValue.trim();
};

const isPlainObject = (candidateValue) =>
  typeof candidateValue === 'object' && candidateValue !== null && !Array.isArray(candidateValue);

const isNodeFileSystemError = (caughtError) =>
  caughtError instanceof Error && 'code' in caughtError && typeof caughtError.code === 'string';
