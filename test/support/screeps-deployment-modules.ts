import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export interface ScreepsConfig {
  readonly branch: string;
  readonly protocol: 'http' | 'https';
  readonly server: string;
  readonly token: string;
}

export interface PtrScreepsConfig {
  readonly branch: string;
  readonly token: string;
}

export interface ConfigModule {
  readMainScreepsConfigFrom(workspacePath: string): Promise<ScreepsConfig>;
}

export interface PtrConfigModule {
  readPtrScreepsConfigFrom(workspacePath: string): Promise<PtrScreepsConfig>;
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

export interface PtrRollbackSnapshotModule {
  assertPtrSnapshotBranch(rollbackSnapshot: RollbackSnapshot, branch: string): void;
  createPtrRollbackSnapshot(
    branch: string,
    modules: Record<string, string>,
    capturedAt: string,
  ): RollbackSnapshot;
  readPtrRollbackSnapshotFrom(workspacePath: string): Promise<RollbackSnapshot>;
  writePtrRollbackSnapshotTo(
    workspacePath: string,
    rollbackSnapshot: RollbackSnapshot,
  ): Promise<void>;
}

export interface ScreepsApiModule {
  readLiveAccountIdentity(
    screepsConfig: ScreepsConfig,
  ): Promise<{ readonly accountId: string; readonly username?: string }>;
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

export interface PtrApiModule {
  placePtrSpawn(
    ptrConfig: PtrScreepsConfig,
    spawnTarget: {
      readonly roomName: string;
      readonly shardName: string;
      readonly spawnName: string;
      readonly x: number;
      readonly y: number;
    },
  ): Promise<{ readonly newbie?: boolean }>;
  readPtrAccountStatus(ptrConfig: PtrScreepsConfig): Promise<Record<string, unknown>>;
  readPtrOverview(ptrConfig: PtrScreepsConfig): Promise<Record<string, unknown>>;
  readPtrRoomObjects(
    ptrConfig: PtrScreepsConfig,
    shardName: string,
    roomName: string,
  ): Promise<unknown[]>;
  readPtrRoomStatus(
    ptrConfig: PtrScreepsConfig,
    shardName: string,
    roomName: string,
  ): Promise<string>;
  readPtrShardInfo(ptrConfig: PtrScreepsConfig): Promise<Record<string, unknown>>;
  readPtrRemoteModuleSet(ptrConfig: PtrScreepsConfig): Promise<Record<string, string>>;
  uploadPtrRemoteModuleSet(
    ptrConfig: PtrScreepsConfig,
    moduleSet: Record<string, string>,
  ): Promise<void>;
}

export interface PtrDeployModule {
  deployPtrScreepsFrom(workspacePath: string): Promise<void>;
}

export interface PtrRollbackModule {
  rollbackPtrScreepsFrom(workspacePath: string): Promise<void>;
}

export interface PtrVerifyModule {
  verifyPtrScreepsReadbackFrom(workspacePath: string): Promise<void>;
}

export interface PtrRoomFoundingModule {
  foundPtrMainRoomFrom(workspacePath: string): Promise<void>;
}

export interface LiveSurvivalStatusModule {
  checkLiveSurvivalStatusFrom(
    workspacePath: string,
    commandArguments: readonly string[],
  ): Promise<void>;
  parseLiveSurvivalStatusRequest(commandArguments: readonly string[]): {
    readonly roomName: string;
    readonly shardName: string;
  };
}

export const loadConfigModule = async (): Promise<ConfigModule> => {
  const loadedModule = await loadDeploymentModule('scripts/screeps/config.mjs');

  if (!isConfigModule(loadedModule)) {
    throw new Error('config.mjs exports changed.');
  }

  return loadedModule;
};

export const loadPtrConfigModule = async (): Promise<PtrConfigModule> => {
  const loadedModule = await loadDeploymentModule('scripts/screeps/ptr-config.mjs');

  if (!isPtrConfigModule(loadedModule)) {
    throw new Error('ptr-config.mjs exports changed.');
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

export const loadPtrRollbackSnapshotModule = async (): Promise<PtrRollbackSnapshotModule> => {
  const loadedModule = await loadDeploymentModule('scripts/screeps/ptr-rollback-snapshot.mjs');

  if (!isPtrRollbackSnapshotModule(loadedModule)) {
    throw new Error('ptr-rollback-snapshot.mjs exports changed.');
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

export const loadPtrApiModule = async (): Promise<PtrApiModule> => {
  const loadedModule = await loadDeploymentModule('scripts/screeps/ptr-api.mjs');

  if (!isPtrApiModule(loadedModule)) {
    throw new Error('ptr-api.mjs exports changed.');
  }

  return loadedModule;
};

export const loadPtrDeployModule = async (): Promise<PtrDeployModule> => {
  const loadedModule = await loadDeploymentModule('scripts/screeps/deploy-ptr.mjs');

  if (!isPtrDeployModule(loadedModule)) {
    throw new Error('deploy-ptr.mjs exports changed.');
  }

  return loadedModule;
};

export const loadPtrRollbackModule = async (): Promise<PtrRollbackModule> => {
  const loadedModule = await loadDeploymentModule('scripts/screeps/rollback-ptr.mjs');

  if (!isPtrRollbackModule(loadedModule)) {
    throw new Error('rollback-ptr.mjs exports changed.');
  }

  return loadedModule;
};

export const loadPtrVerifyModule = async (): Promise<PtrVerifyModule> => {
  const loadedModule = await loadDeploymentModule('scripts/screeps/verify-ptr.mjs');

  if (!isPtrVerifyModule(loadedModule)) {
    throw new Error('verify-ptr.mjs exports changed.');
  }

  return loadedModule;
};

export const loadPtrRoomFoundingModule = async (): Promise<PtrRoomFoundingModule> => {
  const loadedModule = await loadDeploymentModule('scripts/screeps/found-ptr-room.mjs');

  if (!isPtrRoomFoundingModule(loadedModule)) {
    throw new Error('found-ptr-room.mjs exports changed.');
  }

  return loadedModule;
};

export const loadLiveSurvivalStatusModule = async (): Promise<LiveSurvivalStatusModule> => {
  const loadedModule = await loadDeploymentModule('scripts/screeps/live-survival-status.mjs');

  if (!isLiveSurvivalStatusModule(loadedModule)) {
    throw new Error('live-survival-status.mjs exports changed.');
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

const isPtrConfigModule = (candidateModule: unknown): candidateModule is PtrConfigModule =>
  isRecord(candidateModule) && hasFunction(candidateModule, 'readPtrScreepsConfigFrom');

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

const isPtrRollbackSnapshotModule = (
  candidateModule: unknown,
): candidateModule is PtrRollbackSnapshotModule =>
  isRecord(candidateModule) &&
  hasFunction(candidateModule, 'assertPtrSnapshotBranch') &&
  hasFunction(candidateModule, 'createPtrRollbackSnapshot') &&
  hasFunction(candidateModule, 'readPtrRollbackSnapshotFrom') &&
  hasFunction(candidateModule, 'writePtrRollbackSnapshotTo');

const isScreepsApiModule = (candidateModule: unknown): candidateModule is ScreepsApiModule =>
  isRecord(candidateModule) &&
  hasFunction(candidateModule, 'readLiveAccountIdentity') &&
  hasFunction(candidateModule, 'readRoomObjects') &&
  hasFunction(candidateModule, 'readRoomStatus') &&
  hasFunction(candidateModule, 'readRoomTerrainText') &&
  hasFunction(candidateModule, 'readRemoteModuleSet') &&
  hasFunction(candidateModule, 'uploadRemoteModuleSet');

const isPtrApiModule = (candidateModule: unknown): candidateModule is PtrApiModule =>
  isRecord(candidateModule) &&
  hasFunction(candidateModule, 'placePtrSpawn') &&
  hasFunction(candidateModule, 'readPtrAccountStatus') &&
  hasFunction(candidateModule, 'readPtrOverview') &&
  hasFunction(candidateModule, 'readPtrRoomObjects') &&
  hasFunction(candidateModule, 'readPtrRoomStatus') &&
  hasFunction(candidateModule, 'readPtrShardInfo') &&
  hasFunction(candidateModule, 'readPtrRemoteModuleSet') &&
  hasFunction(candidateModule, 'uploadPtrRemoteModuleSet');

const isPtrDeployModule = (candidateModule: unknown): candidateModule is PtrDeployModule =>
  isRecord(candidateModule) && hasFunction(candidateModule, 'deployPtrScreepsFrom');

const isPtrRollbackModule = (candidateModule: unknown): candidateModule is PtrRollbackModule =>
  isRecord(candidateModule) && hasFunction(candidateModule, 'rollbackPtrScreepsFrom');

const isPtrVerifyModule = (candidateModule: unknown): candidateModule is PtrVerifyModule =>
  isRecord(candidateModule) && hasFunction(candidateModule, 'verifyPtrScreepsReadbackFrom');

const isPtrRoomFoundingModule = (
  candidateModule: unknown,
): candidateModule is PtrRoomFoundingModule =>
  isRecord(candidateModule) && hasFunction(candidateModule, 'foundPtrMainRoomFrom');

const isLiveSurvivalStatusModule = (
  candidateModule: unknown,
): candidateModule is LiveSurvivalStatusModule =>
  isRecord(candidateModule) &&
  hasFunction(candidateModule, 'checkLiveSurvivalStatusFrom') &&
  hasFunction(candidateModule, 'parseLiveSurvivalStatusRequest');

const isRecord = (candidateValue: unknown): candidateValue is Record<string, unknown> =>
  typeof candidateValue === 'object' && candidateValue !== null;
