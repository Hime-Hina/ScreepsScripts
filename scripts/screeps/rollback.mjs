#!/usr/bin/env node

import { pathToFileURL } from 'node:url';

import { reportCommandFailure } from './command-failure.mjs';
import { readMainScreepsConfig } from './config.mjs';
import { describeModuleNames, hashModuleSet, moduleSetsAreEqual } from './module-set.mjs';
import { assertSnapshotBranch, readRollbackSnapshot } from './rollback-snapshot.mjs';
import { readRemoteModuleSet, uploadRemoteModuleSet } from './screeps-api.mjs';

export const rollbackScreeps = async () => {
  const screepsConfig = await readMainScreepsConfig();
  const rollbackSnapshot = await readRollbackSnapshot();

  assertSnapshotBranch(rollbackSnapshot, screepsConfig.branch);
  await uploadRemoteModuleSet(screepsConfig, rollbackSnapshot.modules);

  const restoredModules = await readRemoteModuleSet(screepsConfig);

  if (!moduleSetsAreEqual(rollbackSnapshot.modules, restoredModules)) {
    throw new Error(
      'Readback mismatch after rollback; remote code does not match rollback snapshot.',
    );
  }

  console.log(
    `[rollback:screeps] branch=${screepsConfig.branch} modules=${describeModuleNames(
      restoredModules,
    )} hash=${hashModuleSet(restoredModules)}`,
  );
  console.log(`[rollback:screeps] restoredSnapshotCapturedAt=${rollbackSnapshot.capturedAt}`);
};

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await rollbackScreeps();
  } catch (caughtError) {
    reportCommandFailure('rollback:screeps', caughtError);
  }
}
