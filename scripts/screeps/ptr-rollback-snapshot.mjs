import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { hashEachModule, hashModuleSet } from './module-set.mjs';

export const PTR_ROLLBACK_SNAPSHOT_SCHEMA_VERSION = 1;
export const PTR_ROLLBACK_SNAPSHOT_PATH = join('.screeps', 'ptr', 'latest.json');

export class PtrRollbackSnapshotError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PtrRollbackSnapshotError';
  }
}

export const createPtrRollbackSnapshot = (branch, modules, capturedAt) => ({
  schemaVersion: PTR_ROLLBACK_SNAPSHOT_SCHEMA_VERSION,
  capturedAt,
  branch,
  moduleSetHash: hashModuleSet(modules),
  moduleHashes: hashEachModule(modules),
  modules,
});

export const writePtrRollbackSnapshot = async (rollbackSnapshot) =>
  writePtrRollbackSnapshotTo(process.cwd(), rollbackSnapshot);

export const writePtrRollbackSnapshotTo = async (workspacePath, rollbackSnapshot) => {
  const snapshotPath = join(workspacePath, PTR_ROLLBACK_SNAPSHOT_PATH);

  await mkdir(dirname(snapshotPath), { recursive: true });
  await writeFile(snapshotPath, `${JSON.stringify(rollbackSnapshot, null, 2)}\n`, 'utf8');
};

export const readPtrRollbackSnapshot = async () => readPtrRollbackSnapshotFrom(process.cwd());

export const readPtrRollbackSnapshotFrom = async (workspacePath) => {
  const snapshotPath = join(workspacePath, PTR_ROLLBACK_SNAPSHOT_PATH);
  let snapshotText;

  try {
    snapshotText = await readFile(snapshotPath, 'utf8');
  } catch (caughtError) {
    if (isNodeFileSystemError(caughtError) && caughtError.code === 'ENOENT') {
      throw new PtrRollbackSnapshotError(
        `Missing PTR rollback snapshot at ${PTR_ROLLBACK_SNAPSHOT_PATH}.`,
      );
    }

    throw caughtError;
  }

  return decodePtrRollbackSnapshot(parsePtrRollbackSnapshotText(snapshotText));
};

export const assertPtrSnapshotBranch = (rollbackSnapshot, branch) => {
  if (rollbackSnapshot.branch !== branch) {
    throw new PtrRollbackSnapshotError(
      `PTR rollback snapshot branch "${rollbackSnapshot.branch}" does not match configured branch "${branch}".`,
    );
  }
};

export const parsePtrRollbackSnapshotText = (snapshotText) => {
  try {
    return JSON.parse(snapshotText);
  } catch {
    throw new PtrRollbackSnapshotError(`${PTR_ROLLBACK_SNAPSHOT_PATH} is not valid JSON.`);
  }
};

export const decodePtrRollbackSnapshot = (rawSnapshot) => {
  if (!isPlainObject(rawSnapshot)) {
    throw new PtrRollbackSnapshotError('PTR rollback snapshot must contain an object.');
  }

  if (rawSnapshot.schemaVersion !== PTR_ROLLBACK_SNAPSHOT_SCHEMA_VERSION) {
    throw new PtrRollbackSnapshotError('PTR rollback snapshot schema version is not supported.');
  }

  if (typeof rawSnapshot.capturedAt !== 'string' || rawSnapshot.capturedAt.trim() === '') {
    throw new PtrRollbackSnapshotError('PTR rollback snapshot must contain capturedAt.');
  }

  if (typeof rawSnapshot.branch !== 'string' || rawSnapshot.branch.trim() === '') {
    throw new PtrRollbackSnapshotError('PTR rollback snapshot must contain branch.');
  }

  if (typeof rawSnapshot.moduleSetHash !== 'string' || rawSnapshot.moduleSetHash.trim() === '') {
    throw new PtrRollbackSnapshotError('PTR rollback snapshot must contain moduleSetHash.');
  }

  if (!isPlainObject(rawSnapshot.moduleHashes)) {
    throw new PtrRollbackSnapshotError('PTR rollback snapshot must contain moduleHashes.');
  }

  if (!isPlainObject(rawSnapshot.modules)) {
    throw new PtrRollbackSnapshotError('PTR rollback snapshot must contain modules.');
  }

  const moduleHashes = decodeStringRecord(rawSnapshot.moduleHashes, 'moduleHashes');
  const modules = decodeStringRecord(rawSnapshot.modules, 'modules');

  assertPtrSnapshotHashes(rawSnapshot.moduleSetHash, moduleHashes, modules);

  return {
    schemaVersion: rawSnapshot.schemaVersion,
    capturedAt: rawSnapshot.capturedAt,
    branch: rawSnapshot.branch,
    moduleSetHash: rawSnapshot.moduleSetHash,
    moduleHashes,
    modules,
  };
};

const assertPtrSnapshotHashes = (moduleSetHash, moduleHashes, modules) => {
  if (hashModuleSet(modules) !== moduleSetHash) {
    throw new PtrRollbackSnapshotError(
      'PTR rollback snapshot moduleSetHash does not match modules.',
    );
  }

  const expectedModuleHashes = hashEachModule(modules);

  for (const [moduleName, expectedHash] of Object.entries(expectedModuleHashes)) {
    if (moduleHashes[moduleName] !== expectedHash) {
      throw new PtrRollbackSnapshotError(
        `PTR rollback snapshot hash for module "${moduleName}" does not match modules.`,
      );
    }
  }
};

const decodeStringRecord = (rawRecord, fieldName) => {
  const stringRecord = {};

  for (const [recordKey, recordValue] of Object.entries(rawRecord)) {
    if (typeof recordValue !== 'string') {
      throw new PtrRollbackSnapshotError(
        `PTR rollback snapshot ${fieldName}.${recordKey} must be a string.`,
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
