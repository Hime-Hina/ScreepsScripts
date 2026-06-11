import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';

import { runCommand } from './command-execution.mjs';
import {
  ALLOWED_BUILD_PACKAGES,
  LOCAL_SERVER_ROOT,
  OFFICIAL_SERVER_VERSION,
  SERVER_PACKAGE_ROOT,
} from './local-server-contract.mjs';

export async function ensureOfficialServerPackage() {
  await ensureLocalServerRoot();

  const installedVersion = await readInstalledScreepsVersion();
  const hasNativeDriver = await canResolveFromScreepsPackage(
    '@screeps/driver/native/build/Release/native.node',
  );
  const hasIsolatedVm = await canResolveFromScreepsPackage('isolated-vm');

  if (installedVersion === OFFICIAL_SERVER_VERSION && hasNativeDriver && hasIsolatedVm) {
    console.log(`screeps-server package cache reused screeps@${OFFICIAL_SERVER_VERSION}`);
    return;
  }

  await rebuildOfficialServerPackage();
}

export function createOfficialServerRequire() {
  return createRequire(path.join(SERVER_PACKAGE_ROOT, 'node_modules/screeps/package.json'));
}

async function ensureLocalServerRoot() {
  await fs.mkdir(LOCAL_SERVER_ROOT, { recursive: true });
}

async function readInstalledScreepsVersion() {
  try {
    const manifestPath = path.join(SERVER_PACKAGE_ROOT, 'node_modules/screeps/package.json');
    const packageManifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    return typeof packageManifest.version === 'string' ? packageManifest.version : undefined;
  } catch (readError) {
    if (readError && readError.code === 'ENOENT') {
      return undefined;
    }

    throw readError;
  }
}

async function canResolveFromScreepsPackage(moduleName) {
  try {
    await fs.access(path.join(SERVER_PACKAGE_ROOT, 'node_modules/screeps/package.json'));
    const packageRequire = createOfficialServerRequire();
    packageRequire.resolve(moduleName);
    return true;
  } catch (resolveError) {
    if (
      resolveError &&
      (resolveError.code === 'MODULE_NOT_FOUND' || resolveError.code === 'ENOENT')
    ) {
      return false;
    }

    throw resolveError;
  }
}

async function rebuildOfficialServerPackage() {
  await assertSafePackageCachePath();
  await fs.rm(SERVER_PACKAGE_ROOT, { force: true, recursive: true });
  await fs.mkdir(SERVER_PACKAGE_ROOT, { recursive: true });

  const installArguments = [
    'add',
    `screeps@${OFFICIAL_SERVER_VERSION}`,
    '--save-exact',
    '--dir',
    SERVER_PACKAGE_ROOT,
  ];

  for (const packageName of ALLOWED_BUILD_PACKAGES) {
    installArguments.push(`--allow-build=${packageName}`);
  }

  await runCommand('pnpm', installArguments, path.resolve('.'));

  const hasNativeDriver = await canResolveFromScreepsPackage(
    '@screeps/driver/native/build/Release/native.node',
  );

  if (!hasNativeDriver) {
    throw new Error('screeps@4.3.0 installed without @screeps/driver native artifact.');
  }
}

async function assertSafePackageCachePath() {
  const localServerRoot = path.resolve(LOCAL_SERVER_ROOT);
  const packageRoot = path.resolve(SERVER_PACKAGE_ROOT);
  const relativePackageRoot = path.relative(localServerRoot, packageRoot);

  if (
    relativePackageRoot !== 'package' ||
    relativePackageRoot.startsWith('..') ||
    path.isAbsolute(relativePackageRoot)
  ) {
    throw new Error(`Refusing to rebuild unsafe Screeps package cache path: ${packageRoot}`);
  }
}
