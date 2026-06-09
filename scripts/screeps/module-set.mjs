import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const LOCAL_MAIN_MODULE_NAME = 'main';
export const LOCAL_MAIN_ARTIFACT_PATH = join('dist', 'main.js');

export class ScreepsModuleSetError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ScreepsModuleSetError';
  }
}

export const readLocalMainModuleSet = async () => readLocalMainModuleSetFrom(process.cwd());

export const readLocalMainModuleSetFrom = async (workspacePath) => ({
  [LOCAL_MAIN_MODULE_NAME]: await readFile(join(workspacePath, LOCAL_MAIN_ARTIFACT_PATH), 'utf8'),
});

export const decodeRemoteModuleSet = (rawModules) => {
  if (!isPlainObject(rawModules)) {
    throw new ScreepsModuleSetError('Screeps API response must contain a modules object.');
  }

  const remoteModules = {};

  for (const [moduleName, moduleSource] of Object.entries(rawModules)) {
    if (typeof moduleSource !== 'string') {
      throw new ScreepsModuleSetError(`Remote module "${moduleName}" must be a string.`);
    }

    remoteModules[moduleName] = moduleSource;
  }

  return remoteModules;
};

export const hashModuleSource = (moduleSource) =>
  createHash('sha256').update(moduleSource).digest('hex');

export const hashModuleSet = (moduleSet) =>
  createHash('sha256').update(serializeModuleSet(moduleSet)).digest('hex');

export const hashEachModule = (moduleSet) => {
  const moduleHashes = {};

  for (const moduleName of sortedModuleNames(moduleSet)) {
    moduleHashes[moduleName] = hashModuleSource(moduleSet[moduleName]);
  }

  return moduleHashes;
};

export const moduleSetsAreEqual = (leftModuleSet, rightModuleSet) =>
  serializeModuleSet(leftModuleSet) === serializeModuleSet(rightModuleSet);

export const describeModuleNames = (moduleSet) => {
  const moduleNames = sortedModuleNames(moduleSet);

  return moduleNames.length === 0 ? '(none)' : moduleNames.join(', ');
};

const serializeModuleSet = (moduleSet) => {
  const normalizedModuleSet = {};

  for (const moduleName of sortedModuleNames(moduleSet)) {
    const moduleSource = moduleSet[moduleName];

    if (typeof moduleSource !== 'string') {
      throw new ScreepsModuleSetError(`Module "${moduleName}" must be a string.`);
    }

    normalizedModuleSet[moduleName] = moduleSource;
  }

  return JSON.stringify(normalizedModuleSet);
};

const sortedModuleNames = (moduleSet) =>
  Object.keys(moduleSet).sort((leftName, rightName) => leftName.localeCompare(rightName));

const isPlainObject = (candidateValue) =>
  typeof candidateValue === 'object' && candidateValue !== null && !Array.isArray(candidateValue);
