import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { hashEachModule, hashModuleSet } from './module-set.mjs';

export const ROLLBACK_SNAPSHOT_SCHEMA_VERSION = 1;
export const ROLLBACK_SNAPSHOT_PATH = join('.screeps', 'rollback', 'latest.json');

export class RollbackSnapshotError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RollbackSnapshotError';
  }
}

export const createRollbackSnapshot = (branch, modules, capturedAt) => ({
  schemaVersion: ROLLBACK_SNAPSHOT_SCHEMA_VERSION,
  capturedAt,
  branch,
  moduleSetHash: hashModuleSet(modules),
  moduleHashes: hashEachModule(modules),
  modules,
});

export const writeRollbackSnapshot = async (rollbackSnapshot) =>
  writeRollbackSnapshotTo(process.cwd(), rollbackSnapshot);

export const writeRollbackSnapshotTo = async (workspacePath, rollbackSnapshot) => {
  const snapshotPath = join(workspacePath, ROLLBACK_SNAPSHOT_PATH);

  await mkdir(dirname(snapshotPath), { recursive: true });
  await writeFile(snapshotPath, `${JSON.stringify(rollbackSnapshot, null, 2)}\n`, 'utf8');
};

export const readRollbackSnapshot = async () => readRollbackSnapshotFrom(process.cwd());

export const readRollbackSnapshotFrom = async (workspacePath) => {
  const snapshotPath = join(workspacePath, ROLLBACK_SNAPSHOT_PATH);
  let snapshotText;

  try {
    snapshotText = await readFile(snapshotPath, 'utf8');
  } catch (caughtError) {
    if (isNodeFileSystemError(caughtError) && caughtError.code === 'ENOENT') {
      throw new RollbackSnapshotError(`Missing rollback snapshot at ${ROLLBACK_SNAPSHOT_PATH}.`);
    }

    throw caughtError;
  }

  return decodeRollbackSnapshot(parseRollbackSnapshotText(snapshotText));
};

export const assertSnapshotBranch = (rollbackSnapshot, branch) => {
  if (rollbackSnapshot.branch !== branch) {
    throw new RollbackSnapshotError(
      `Rollback snapshot branch "${rollbackSnapshot.branch}" does not match configured branch "${branch}".`,
    );
  }
};

export const parseRollbackSnapshotText = (snapshotText) => {
  try {
    return JSON.parse(snapshotText);
  } catch {
    throw new RollbackSnapshotError(`${ROLLBACK_SNAPSHOT_PATH} is not valid JSON.`);
  }
};

export const decodeRollbackSnapshot = (rawSnapshot) => {
  if (!isPlainObject(rawSnapshot)) {
    throw new RollbackSnapshotError('Rollback snapshot must contain an object.');
  }

  if (rawSnapshot.schemaVersion !== ROLLBACK_SNAPSHOT_SCHEMA_VERSION) {
    throw new RollbackSnapshotError('Rollback snapshot schema version is not supported.');
  }

  if (typeof rawSnapshot.capturedAt !== 'string' || rawSnapshot.capturedAt.trim() === '') {
    throw new RollbackSnapshotError('Rollback snapshot must contain capturedAt.');
  }

  if (typeof rawSnapshot.branch !== 'string' || rawSnapshot.branch.trim() === '') {
    throw new RollbackSnapshotError('Rollback snapshot must contain branch.');
  }

  if (typeof rawSnapshot.moduleSetHash !== 'string' || rawSnapshot.moduleSetHash.trim() === '') {
    throw new RollbackSnapshotError('Rollback snapshot must contain moduleSetHash.');
  }

  if (!isPlainObject(rawSnapshot.moduleHashes)) {
    throw new RollbackSnapshotError('Rollback snapshot must contain moduleHashes.');
  }

  if (!isPlainObject(rawSnapshot.modules)) {
    throw new RollbackSnapshotError('Rollback snapshot must contain modules.');
  }

  const moduleHashes = decodeStringRecord(rawSnapshot.moduleHashes, 'moduleHashes');
  const modules = decodeStringRecord(rawSnapshot.modules, 'modules');

  assertSnapshotHashes(rawSnapshot.moduleSetHash, moduleHashes, modules);

  return {
    schemaVersion: rawSnapshot.schemaVersion,
    capturedAt: rawSnapshot.capturedAt,
    branch: rawSnapshot.branch,
    moduleSetHash: rawSnapshot.moduleSetHash,
    moduleHashes,
    modules,
  };
};

const assertSnapshotHashes = (moduleSetHash, moduleHashes, modules) => {
  if (hashModuleSet(modules) !== moduleSetHash) {
    throw new RollbackSnapshotError('Rollback snapshot moduleSetHash does not match modules.');
  }

  const expectedModuleHashes = hashEachModule(modules);

  for (const [moduleName, expectedHash] of Object.entries(expectedModuleHashes)) {
    if (moduleHashes[moduleName] !== expectedHash) {
      throw new RollbackSnapshotError(
        `Rollback snapshot hash for module "${moduleName}" does not match modules.`,
      );
    }
  }
};

const decodeStringRecord = (rawRecord, fieldName) => {
  const stringRecord = {};

  for (const [recordKey, recordValue] of Object.entries(rawRecord)) {
    if (typeof recordValue !== 'string') {
      throw new RollbackSnapshotError(
        `Rollback snapshot ${fieldName}.${recordKey} must be a string.`,
      );
    }

    stringRecord[recordKey] = recordValue;
  }

  return stringRecord;
};

const isPlainObject = (candidateValue) =>
  typeof candidateValue === 'object' && candidateValue !== null && !Array.isArray(candidateValue);

const isNodeFileSystemError = (caughtError) =>
  caughtError instanceof Error && 'code' in caughtError && typeof caughtError.code === 'string';
