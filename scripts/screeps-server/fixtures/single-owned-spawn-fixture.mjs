import fs from 'node:fs/promises';
import path from 'node:path';

import { RUNS_ROOT } from '../framework/local-server-contract.mjs';
import { createOfficialServerRequire } from '../framework/official-package.mjs';
import { writeStatusMod } from '../observability/status-mod.mjs';

export const SINGLE_OWNED_SPAWN_FIXTURE_NAME = 'single-owned-spawn';

export const SINGLE_OWNED_SPAWN_ACTIVE_BOT = Object.freeze({
  memoryRootKey: 'screepsScripts',
  memorySchemaVersion: 1,
  room: 'W1N9',
  spawnName: 'Spawn1',
  userId: 'e3b732c504eb83a',
  username: 'AliceBot',
});

export async function prepareSingleOwnedSpawnRun() {
  const runId = createRunId();
  const runDirectory = path.join(RUNS_ROOT, runId);
  const packageRequire = createOfficialServerRequire();
  const launcherManifestPath = packageRequire.resolve('@screeps/launcher/package.json');
  const initDistributionRoot = path.join(path.dirname(launcherManifestPath), 'init_dist');
  const dbPath = path.join(runDirectory, 'db.json');
  const statusFilePath = path.join(runDirectory, 'status.jsonl');
  const logDirectory = path.join(runDirectory, 'logs');

  await fs.mkdir(runDirectory, { recursive: true });
  await fs.cp(initDistributionRoot, runDirectory, { recursive: true });
  await fs.mkdir(logDirectory, { recursive: true });
  await rewriteServerRc(path.join(runDirectory, '.screepsrc'));
  await rewriteDbForSingleOwnedSpawn(dbPath);
  await writeStatusMod(
    path.join(runDirectory, 'status-mod.cjs'),
    statusFilePath,
    SINGLE_OWNED_SPAWN_ACTIVE_BOT,
  );
  await fs.writeFile(
    path.join(runDirectory, 'mods.json'),
    JSON.stringify({ bots: {}, mods: ['status-mod.cjs'] }, null, 2),
    'utf8',
  );

  return {
    dbPath,
    logDirectory,
    playerRuntimeContract: {
      memoryRootKey: SINGLE_OWNED_SPAWN_ACTIVE_BOT.memoryRootKey,
      memorySchemaVersion: SINGLE_OWNED_SPAWN_ACTIVE_BOT.memorySchemaVersion,
      username: SINGLE_OWNED_SPAWN_ACTIVE_BOT.username,
    },
    runDirectory,
    statusFilePath,
  };
}

async function rewriteServerRc(serverRcPath) {
  const serverRc = await fs.readFile(serverRcPath, 'utf8');
  const rewrittenServerRc = serverRc
    .replace(/steam_api_key = \{\{STEAM_KEY\}\}/u, 'steam_api_key =')
    .replace(/host = .*/u, 'host = 127.0.0.1')
    .replace(/cli_host = .*/u, 'cli_host = 127.0.0.1')
    .replace(/runner_threads = .*/u, 'runner_threads = 1')
    .replace(/processors_cnt = .*/u, 'processors_cnt = 1')
    .replace(/log_console = .*/u, 'log_console = true');

  await fs.writeFile(serverRcPath, rewrittenServerRc, 'utf8');
}

async function rewriteDbForSingleOwnedSpawn(dbPath) {
  const compiledMainModule = await fs.readFile('dist/main.js', 'utf8');
  const lokiDatabase = JSON.parse(await fs.readFile(dbPath, 'utf8'));
  const usersCollection = readLokiCollection(lokiDatabase, 'users');
  const userCodeCollection = readLokiCollection(lokiDatabase, 'users.code');
  const roomObjectsCollection = readLokiCollection(lokiDatabase, 'rooms.objects');
  const activeBotUser = usersCollection.data.find(
    (user) => user._id === SINGLE_OWNED_SPAWN_ACTIVE_BOT.userId,
  );
  const activeBotCode = userCodeCollection.data.find(
    (userCode) => userCode.user === SINGLE_OWNED_SPAWN_ACTIVE_BOT.userId,
  );
  const activeBotSpawn = roomObjectsCollection.data.find(
    (roomObject) =>
      roomObject.type === 'spawn' &&
      roomObject.user === SINGLE_OWNED_SPAWN_ACTIVE_BOT.userId &&
      roomObject.room === SINGLE_OWNED_SPAWN_ACTIVE_BOT.room &&
      roomObject.name === SINGLE_OWNED_SPAWN_ACTIVE_BOT.spawnName,
  );

  if (!activeBotUser || activeBotUser.username !== SINGLE_OWNED_SPAWN_ACTIVE_BOT.username) {
    throw new Error('Official seed data does not contain the expected AliceBot user.');
  }
  if (!activeBotCode) {
    throw new Error('Official seed data does not contain AliceBot code.');
  }
  if (!activeBotSpawn) {
    throw new Error('Official seed data does not contain AliceBot Spawn1 in W1N9.');
  }

  for (const user of usersCollection.data) {
    if (user.bot === 'simplebot' && user._id !== SINGLE_OWNED_SPAWN_ACTIVE_BOT.userId) {
      user.active = 0;
      user.cpu = 0;
    }
  }

  activeBotUser.active = true;
  activeBotUser.cpu = 100;
  activeBotUser.cpuAvailable = 0;

  for (const userCode of userCodeCollection.data) {
    userCode.activeWorld = userCode.user === SINGLE_OWNED_SPAWN_ACTIVE_BOT.userId;
    userCode.activeSim = userCode.user === SINGLE_OWNED_SPAWN_ACTIVE_BOT.userId;
  }

  activeBotCode.branch = 'default';
  activeBotCode.modules = {
    main: compiledMainModule,
  };

  await fs.writeFile(dbPath, JSON.stringify(lokiDatabase), 'utf8');
}

function readLokiCollection(lokiDatabase, collectionName) {
  const collection = lokiDatabase.collections.find(
    (candidateCollection) => candidateCollection.name === collectionName,
  );

  if (!collection || !Array.isArray(collection.data)) {
    throw new Error(`Official seed database does not contain ${collectionName}.`);
  }

  return collection;
}

function createRunId() {
  const timestamp = new Date()
    .toISOString()
    .replaceAll(':', '')
    .replaceAll('.', '')
    .replace('T', '-')
    .replace('Z', '');

  return `single-owned-spawn-${timestamp}-${process.pid}`;
}

export function describeSingleOwnedSpawnFixture() {
  return `fixture=${SINGLE_OWNED_SPAWN_FIXTURE_NAME} user=${SINGLE_OWNED_SPAWN_ACTIVE_BOT.username} room=${SINGLE_OWNED_SPAWN_ACTIVE_BOT.room} spawn=${SINGLE_OWNED_SPAWN_ACTIVE_BOT.spawnName}`;
}
