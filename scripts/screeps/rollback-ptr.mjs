#!/usr/bin/env node

import { pathToFileURL } from 'node:url';

import { reportCommandFailure } from './command-failure.mjs';
import { describeModuleNames, hashModuleSet, moduleSetsAreEqual } from './module-set.mjs';
import { readPtrRemoteModuleSet, uploadPtrRemoteModuleSet } from './ptr-api.mjs';
import { readPtrScreepsConfigFrom } from './ptr-config.mjs';
import { assertPtrSnapshotBranch, readPtrRollbackSnapshotFrom } from './ptr-rollback-snapshot.mjs';

export const rollbackPtrScreeps = async () => rollbackPtrScreepsFrom(process.cwd());

export const rollbackPtrScreepsFrom = async (workspacePath) => {
  const ptrConfig = await readPtrScreepsConfigFrom(workspacePath);
  const rollbackSnapshot = await readPtrRollbackSnapshotFrom(workspacePath);

  assertPtrSnapshotBranch(rollbackSnapshot, ptrConfig.branch);
  await uploadPtrRemoteModuleSet(ptrConfig, rollbackSnapshot.modules);

  const restoredModules = await readPtrRemoteModuleSet(ptrConfig);

  if (!moduleSetsAreEqual(rollbackSnapshot.modules, restoredModules)) {
    throw new Error(
      'Readback mismatch after PTR rollback; remote code does not match PTR rollback snapshot.',
    );
  }

  console.log(
    `[rollback:ptr:screeps] branch=${ptrConfig.branch} modules=${describeModuleNames(
      restoredModules,
    )} hash=${hashModuleSet(restoredModules)}`,
  );
  console.log(`[rollback:ptr:screeps] restoredSnapshotCapturedAt=${rollbackSnapshot.capturedAt}`);
};

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await rollbackPtrScreeps();
  } catch (caughtError) {
    reportCommandFailure('rollback:ptr:screeps', caughtError);
  }
}
