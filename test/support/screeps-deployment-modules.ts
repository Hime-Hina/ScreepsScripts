import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export interface ScreepsConfig {
  readonly branch: string;
  readonly protocol: 'http' | 'https';
  readonly server: string;
  readonly token: string;
}

export interface ConfigModule {
  readMainScreepsConfigFrom(workspacePath: string): Promise<ScreepsConfig>;
}

export interface ModuleSetModule {
  decodeRemoteModuleSet(rawModules: unknown): Record<string, string>;
  describeModuleNames(moduleSet: Record<string, string>): string;
  hashModuleSet(moduleSet: Record<string, string>): string;
  moduleSetsAreEqual(
    leftModuleSet: Record<string, string>,
    rightModuleSet: Record<string, string>,
  ): boolean;
  readLocalMainModuleSetFrom(workspacePath: string): Promise<Record<string, string>>;
  requiredModulesMatch(
    requiredModuleSet: Record<string, string>,
    candidateModuleSet: Record<string, string>,
  ): boolean;
}

export interface RollbackSnapshot {
  readonly schemaVersion: number;
  readonly capturedAt: string;
  readonly branch: string;
  readonly moduleSetHash: string;
  readonly moduleHashes: Record<string, string>;
  readonly modules: Record<string, string>;
}

export interface RollbackSnapshotModule {
  assertSnapshotBranch(rollbackSnapshot: RollbackSnapshot, branch: string): void;
  createRollbackSnapshot(
    branch: string,
    modules: Record<string, string>,
    capturedAt: string,
  ): RollbackSnapshot;
  readRollbackSnapshotFrom(workspacePath: string): Promise<RollbackSnapshot>;
  writeRollbackSnapshotTo(workspacePath: string, rollbackSnapshot: RollbackSnapshot): Promise<void>;
}

export interface ScreepsApiModule {
  readRoomObjects(
    screepsConfig: ScreepsConfig,
    shardName: string,
    roomName: string,
  ): Promise<unknown[]>;
  readRoomStatus(
    screepsConfig: ScreepsConfig,
    shardName: string,
    roomName: string,
  ): Promise<string>;
  readRoomTerrainText(
    screepsConfig: ScreepsConfig,
    shardName: string,
    roomName: string,
  ): Promise<string>;
  readRemoteModuleSet(screepsConfig: ScreepsConfig): Promise<Record<string, string>>;
  uploadRemoteModuleSet(
    screepsConfig: ScreepsConfig,
    moduleSet: Record<string, string>,
  ): Promise<void>;
}

export const loadConfigModule = async (): Promise<ConfigModule> => {
  const loadedModule = await loadDeploymentModule('scripts/screeps/config.mjs');

  if (!isConfigModule(loadedModule)) {
    throw new Error('config.mjs exports changed.');
  }

  return loadedModule;
};

export const loadModuleSetModule = async (): Promise<ModuleSetModule> => {
  const loadedModule = await loadDeploymentModule('scripts/screeps/module-set.mjs');

  if (!isModuleSetModule(loadedModule)) {
    throw new Error('module-set.mjs exports changed.');
  }

  return loadedModule;
};

export const loadRollbackSnapshotModule = async (): Promise<RollbackSnapshotModule> => {
  const loadedModule = await loadDeploymentModule('scripts/screeps/rollback-snapshot.mjs');

  if (!isRollbackSnapshotModule(loadedModule)) {
    throw new Error('rollback-snapshot.mjs exports changed.');
  }

  return loadedModule;
};

export const loadScreepsApiModule = async (): Promise<ScreepsApiModule> => {
  const loadedModule = await loadDeploymentModule('scripts/screeps/screeps-api.mjs');

  if (!isScreepsApiModule(loadedModule)) {
    throw new Error('screeps-api.mjs exports changed.');
  }

  return loadedModule;
};

const loadDeploymentModule = async (relativePath: string): Promise<unknown> => {
  const loadedModule = (await import(pathToFileURL(resolve(relativePath)).href)) as unknown;

  if (!isRecord(loadedModule)) {
    throw new Error(`${relativePath} did not load as an object module.`);
  }

  return loadedModule;
};

const hasFunction = (loadedModule: Record<string, unknown>, exportName: string) =>
  typeof loadedModule[exportName] === 'function';

const isConfigModule = (candidateModule: unknown): candidateModule is ConfigModule =>
  isRecord(candidateModule) && hasFunction(candidateModule, 'readMainScreepsConfigFrom');

const isModuleSetModule = (candidateModule: unknown): candidateModule is ModuleSetModule =>
  isRecord(candidateModule) &&
  hasFunction(candidateModule, 'decodeRemoteModuleSet') &&
  hasFunction(candidateModule, 'describeModuleNames') &&
  hasFunction(candidateModule, 'hashModuleSet') &&
  hasFunction(candidateModule, 'moduleSetsAreEqual') &&
  hasFunction(candidateModule, 'readLocalMainModuleSetFrom') &&
  hasFunction(candidateModule, 'requiredModulesMatch');

const isRollbackSnapshotModule = (
  candidateModule: unknown,
): candidateModule is RollbackSnapshotModule =>
  isRecord(candidateModule) &&
  hasFunction(candidateModule, 'assertSnapshotBranch') &&
  hasFunction(candidateModule, 'createRollbackSnapshot') &&
  hasFunction(candidateModule, 'readRollbackSnapshotFrom') &&
  hasFunction(candidateModule, 'writeRollbackSnapshotTo');

const isScreepsApiModule = (candidateModule: unknown): candidateModule is ScreepsApiModule =>
  isRecord(candidateModule) &&
  hasFunction(candidateModule, 'readRoomObjects') &&
  hasFunction(candidateModule, 'readRoomStatus') &&
  hasFunction(candidateModule, 'readRoomTerrainText') &&
  hasFunction(candidateModule, 'readRemoteModuleSet') &&
  hasFunction(candidateModule, 'uploadRemoteModuleSet');

const isRecord = (candidateValue: unknown): candidateValue is Record<string, unknown> =>
  typeof candidateValue === 'object' && candidateValue !== null;
