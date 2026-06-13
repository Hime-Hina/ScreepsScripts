import fs from 'node:fs/promises';
import path from 'node:path';

import { RUNS_ROOT } from '../framework/local-server-contract.mjs';
import { createOfficialServerRequire } from '../framework/official-package.mjs';
import { writeDefenseStatusMod, writeStatusMod } from '../observability/status-mod.mjs';

export const SINGLE_OWNED_SPAWN_FIXTURE_NAME = 'single-owned-spawn';
export const DEFENSE_CORE_THREAT_FIXTURE_NAME = 'defense-core-threat';
export const DEFENSE_HARMLESS_SCOUT_FIXTURE_NAME = 'defense-harmless-scout';
export const DEFENSE_DISTANT_THREAT_FIXTURE_NAME = 'defense-distant-threat';

export const SINGLE_OWNED_SPAWN_ACTIVE_BOT = Object.freeze({
  memoryRootKey: 'screepsScripts',
  memorySchemaVersion: 1,
  room: 'W1N9',
  spawnName: 'Spawn1',
  userId: 'e3b732c504eb83a',
  username: 'AliceBot',
});

export const DEFENSE_CORE_THREAT_HOSTILE_BOT = Object.freeze({
  userId: 'a1123272b261687',
  username: 'MichaelBot',
});

export const DEFENSE_CORE_THREAT_HOSTILE_CREEP = Object.freeze({
  id: 'defense-core-threat-hostile',
  name: 'MichaelBot-core-threat',
  room: SINGLE_OWNED_SPAWN_ACTIVE_BOT.room,
  x: 35,
  y: 5,
});

export const DEFENSE_HARMLESS_SCOUT_HOSTILE_CREEP = Object.freeze({
  id: 'defense-harmless-scout-hostile',
  name: 'MichaelBot-harmless-scout',
  room: SINGLE_OWNED_SPAWN_ACTIVE_BOT.room,
  x: 35,
  y: 5,
});

export const DEFENSE_DISTANT_THREAT_HOSTILE_CREEP = Object.freeze({
  id: 'defense-distant-threat-hostile',
  name: 'MichaelBot-distant-threat',
  room: SINGLE_OWNED_SPAWN_ACTIVE_BOT.room,
  x: 15,
  y: 40,
});

export const DEFENSE_DRILL_CONSTRUCTION_SITE = Object.freeze({
  id: '000-defense-drill-extension-site',
  initialProgress: 0,
  progressTotal: 3000,
  room: SINGLE_OWNED_SPAWN_ACTIVE_BOT.room,
  structureType: 'extension',
  x: 33,
  y: 5,
});

export const DEFENSE_CORE_THREAT_CONTROLLER_ID = 'a87b0774c89f868';
export const DEFENSE_DRILL_CONTROLLER_INITIAL_PROGRESS = 0;

const DEFENSE_DRILL_WORKER_CREEPS = Object.freeze([
  Object.freeze({
    id: 'defense-drill-worker-1',
    name: 'AliceBot-defense-worker-1',
    room: SINGLE_OWNED_SPAWN_ACTIVE_BOT.room,
    x: 31,
    y: 5,
  }),
  Object.freeze({
    id: 'defense-drill-worker-2',
    name: 'AliceBot-defense-worker-2',
    room: SINGLE_OWNED_SPAWN_ACTIVE_BOT.room,
    x: 32,
    y: 5,
  }),
  Object.freeze({
    id: 'defense-drill-worker-3',
    name: 'AliceBot-defense-worker-3',
    room: SINGLE_OWNED_SPAWN_ACTIVE_BOT.room,
    x: 33,
    y: 4,
  }),
]);

export async function prepareSingleOwnedSpawnRun() {
  const runPaths = await createFixtureRunPaths(SINGLE_OWNED_SPAWN_FIXTURE_NAME);

  await rewriteDbForSingleOwnedSpawn(runPaths.dbPath);
  await writeStatusMod(
    path.join(runPaths.runDirectory, 'status-mod.cjs'),
    runPaths.statusFilePath,
    SINGLE_OWNED_SPAWN_ACTIVE_BOT,
  );
  await writeFixtureModsFile(runPaths.runDirectory);

  return createPreparedRun(runPaths);
}

export async function prepareDefenseCoreThreatRun() {
  const runPaths = await createFixtureRunPaths(DEFENSE_CORE_THREAT_FIXTURE_NAME);
  const defenseRuntimeContract = createDefenseRuntimeContract(DEFENSE_CORE_THREAT_HOSTILE_CREEP, [
    'move',
    'attack',
    'work',
    'move',
  ]);

  await rewriteDbForDefenseCoreThreat(runPaths.dbPath);
  await writeDefenseStatusMod(
    path.join(runPaths.runDirectory, 'status-mod.cjs'),
    runPaths.statusFilePath,
    SINGLE_OWNED_SPAWN_ACTIVE_BOT,
    defenseRuntimeContract,
  );
  await writeFixtureModsFile(runPaths.runDirectory);

  return {
    ...createPreparedRun(runPaths),
    defenseRuntimeContract,
  };
}

export async function prepareDefenseHarmlessScoutRun() {
  const runPaths = await createFixtureRunPaths(DEFENSE_HARMLESS_SCOUT_FIXTURE_NAME);
  const defenseRuntimeContract = createDefenseConstructionRuntimeContract(
    DEFENSE_HARMLESS_SCOUT_HOSTILE_CREEP,
    ['move'],
  );

  await rewriteDbForDefenseHarmlessScout(runPaths.dbPath);
  await writeDefenseStatusMod(
    path.join(runPaths.runDirectory, 'status-mod.cjs'),
    runPaths.statusFilePath,
    SINGLE_OWNED_SPAWN_ACTIVE_BOT,
    defenseRuntimeContract,
  );
  await writeFixtureModsFile(runPaths.runDirectory);

  return {
    ...createPreparedRun(runPaths),
    defenseRuntimeContract,
  };
}

export async function prepareDefenseDistantThreatRun() {
  const runPaths = await createFixtureRunPaths(DEFENSE_DISTANT_THREAT_FIXTURE_NAME);
  const defenseRuntimeContract = createDefenseConstructionRuntimeContract(
    DEFENSE_DISTANT_THREAT_HOSTILE_CREEP,
    ['move', 'attack', 'work', 'move'],
  );

  await rewriteDbForDefenseDistantThreat(runPaths.dbPath);
  await writeDefenseStatusMod(
    path.join(runPaths.runDirectory, 'status-mod.cjs'),
    runPaths.statusFilePath,
    SINGLE_OWNED_SPAWN_ACTIVE_BOT,
    defenseRuntimeContract,
  );
  await writeFixtureModsFile(runPaths.runDirectory);

  return {
    ...createPreparedRun(runPaths),
    defenseRuntimeContract,
  };
}

function createDefenseRuntimeContract(hostileCreep, hostileBodyPartTypes) {
  return {
    controllerId: DEFENSE_CORE_THREAT_CONTROLLER_ID,
    hostileBodyPartTypes,
    hostileCreepId: hostileCreep.id,
    hostileX: hostileCreep.x,
    hostileY: hostileCreep.y,
    roomName: SINGLE_OWNED_SPAWN_ACTIVE_BOT.room,
    userId: SINGLE_OWNED_SPAWN_ACTIVE_BOT.userId,
  };
}

function createDefenseConstructionRuntimeContract(hostileCreep, hostileBodyPartTypes) {
  return {
    ...createDefenseRuntimeContract(hostileCreep, hostileBodyPartTypes),
    constructionSiteId: DEFENSE_DRILL_CONSTRUCTION_SITE.id,
    initialConstructionProgress: DEFENSE_DRILL_CONSTRUCTION_SITE.initialProgress,
    initialControllerProgress: DEFENSE_DRILL_CONTROLLER_INITIAL_PROGRESS,
  };
}

async function createFixtureRunPaths(fixtureName) {
  const runId = createRunId(fixtureName);
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

  return {
    dbPath,
    logDirectory,
    runDirectory,
    statusFilePath,
  };
}

async function writeFixtureModsFile(runDirectory) {
  await fs.writeFile(
    path.join(runDirectory, 'mods.json'),
    JSON.stringify({ bots: {}, mods: ['status-mod.cjs'] }, null, 2),
    'utf8',
  );
}

function createPreparedRun(runPaths) {
  return {
    dbPath: runPaths.dbPath,
    logDirectory: runPaths.logDirectory,
    playerRuntimeContract: {
      memoryRootKey: SINGLE_OWNED_SPAWN_ACTIVE_BOT.memoryRootKey,
      memorySchemaVersion: SINGLE_OWNED_SPAWN_ACTIVE_BOT.memorySchemaVersion,
      username: SINGLE_OWNED_SPAWN_ACTIVE_BOT.username,
    },
    runDirectory: runPaths.runDirectory,
    statusFilePath: runPaths.statusFilePath,
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

async function rewriteDbForDefenseCoreThreat(dbPath) {
  await rewriteDbForSingleOwnedSpawn(dbPath);

  const lokiDatabase = JSON.parse(await fs.readFile(dbPath, 'utf8'));
  const roomObjectsCollection = readLokiCollection(lokiDatabase, 'rooms.objects');
  const controller = roomObjectsCollection.data.find(
    (roomObject) => roomObject._id === DEFENSE_CORE_THREAT_CONTROLLER_ID,
  );
  const hostileBotUser = readLokiCollection(lokiDatabase, 'users').data.find(
    (user) => user._id === DEFENSE_CORE_THREAT_HOSTILE_BOT.userId,
  );

  if (!controller || controller.type !== 'controller') {
    throw new Error('Official seed data does not contain the expected W1N9 controller.');
  }
  if (!hostileBotUser || hostileBotUser.username !== DEFENSE_CORE_THREAT_HOSTILE_BOT.username) {
    throw new Error('Official seed data does not contain the expected hostile bot user.');
  }

  controller.safeMode = null;
  controller.safeModeAvailable = 1;
  controller.safeModeCooldown = null;
  controller.upgradeBlocked = null;
  controller.downgradeTime = 20_000;

  addFixtureCreep(
    roomObjectsCollection,
    DEFENSE_CORE_THREAT_HOSTILE_CREEP,
    DEFENSE_CORE_THREAT_HOSTILE_BOT.userId,
    [
      { hits: 100, type: 'move' },
      { hits: 100, type: 'attack' },
      { hits: 100, type: 'work' },
      { hits: 100, type: 'move' },
    ],
  );

  await fs.writeFile(dbPath, JSON.stringify(lokiDatabase), 'utf8');
}

async function rewriteDbForDefenseHarmlessScout(dbPath) {
  await rewriteDbForDefenseConstructionDrill(dbPath);

  const lokiDatabase = JSON.parse(await fs.readFile(dbPath, 'utf8'));
  const roomObjectsCollection = readLokiCollection(lokiDatabase, 'rooms.objects');

  addFixtureCreep(
    roomObjectsCollection,
    DEFENSE_HARMLESS_SCOUT_HOSTILE_CREEP,
    DEFENSE_CORE_THREAT_HOSTILE_BOT.userId,
    [{ hits: 100, type: 'move' }],
  );

  await fs.writeFile(dbPath, JSON.stringify(lokiDatabase), 'utf8');
}

async function rewriteDbForDefenseDistantThreat(dbPath) {
  await rewriteDbForDefenseConstructionDrill(dbPath);

  const lokiDatabase = JSON.parse(await fs.readFile(dbPath, 'utf8'));
  const roomObjectsCollection = readLokiCollection(lokiDatabase, 'rooms.objects');

  addFixtureCreep(
    roomObjectsCollection,
    DEFENSE_DISTANT_THREAT_HOSTILE_CREEP,
    DEFENSE_CORE_THREAT_HOSTILE_BOT.userId,
    [
      { hits: 100, type: 'move' },
      { hits: 100, type: 'attack' },
      { hits: 100, type: 'work' },
      { hits: 100, type: 'move' },
    ],
  );

  await fs.writeFile(dbPath, JSON.stringify(lokiDatabase), 'utf8');
}

async function rewriteDbForDefenseConstructionDrill(dbPath) {
  await rewriteDbForSingleOwnedSpawn(dbPath);

  const lokiDatabase = JSON.parse(await fs.readFile(dbPath, 'utf8'));
  const roomObjectsCollection = readLokiCollection(lokiDatabase, 'rooms.objects');
  const usersCollection = readLokiCollection(lokiDatabase, 'users');
  const controller = roomObjectsCollection.data.find(
    (roomObject) => roomObject._id === DEFENSE_CORE_THREAT_CONTROLLER_ID,
  );
  const hostileBotUser = usersCollection.data.find(
    (user) => user._id === DEFENSE_CORE_THREAT_HOSTILE_BOT.userId,
  );

  if (!controller || controller.type !== 'controller') {
    throw new Error('Official seed data does not contain the expected W1N9 controller.');
  }
  if (!hostileBotUser || hostileBotUser.username !== DEFENSE_CORE_THREAT_HOSTILE_BOT.username) {
    throw new Error('Official seed data does not contain the expected hostile bot user.');
  }

  controller.level = 2;
  controller.progress = DEFENSE_DRILL_CONTROLLER_INITIAL_PROGRESS;
  controller.safeMode = null;
  controller.safeModeAvailable = 1;
  controller.safeModeCooldown = null;
  controller.upgradeBlocked = null;
  controller.downgradeTime = 20_000;

  addDefenseDrillConstructionSite(roomObjectsCollection);
  addDefenseDrillWorkers(roomObjectsCollection);

  await fs.writeFile(dbPath, JSON.stringify(lokiDatabase), 'utf8');
}

function addDefenseDrillConstructionSite(roomObjectsCollection) {
  insertFixtureRoomObject(roomObjectsCollection, DEFENSE_DRILL_CONSTRUCTION_SITE.id, {
    progress: DEFENSE_DRILL_CONSTRUCTION_SITE.initialProgress,
    progressTotal: DEFENSE_DRILL_CONSTRUCTION_SITE.progressTotal,
    room: DEFENSE_DRILL_CONSTRUCTION_SITE.room,
    structureType: DEFENSE_DRILL_CONSTRUCTION_SITE.structureType,
    type: 'constructionSite',
    user: SINGLE_OWNED_SPAWN_ACTIVE_BOT.userId,
    x: DEFENSE_DRILL_CONSTRUCTION_SITE.x,
    y: DEFENSE_DRILL_CONSTRUCTION_SITE.y,
  });
}

function addDefenseDrillWorkers(roomObjectsCollection) {
  const workerBody = [
    { hits: 100, type: 'work' },
    { hits: 100, type: 'carry' },
    { hits: 100, type: 'move' },
  ];

  for (const workerCreep of DEFENSE_DRILL_WORKER_CREEPS) {
    addFixtureCreep(
      roomObjectsCollection,
      workerCreep,
      SINGLE_OWNED_SPAWN_ACTIVE_BOT.userId,
      workerBody,
      { energy: 50 },
    );
  }
}

function addFixtureCreep(roomObjectsCollection, creepIdentity, userId, body, store = {}) {
  const creepEnergyCapacity = body.filter((bodyPart) => bodyPart.type === 'carry').length * 50;

  insertFixtureRoomObject(roomObjectsCollection, creepIdentity.id, {
    body,
    fatigue: 0,
    hits: body.length * 100,
    hitsMax: body.length * 100,
    name: creepIdentity.name,
    notifyWhenAttacked: false,
    room: creepIdentity.room,
    spawning: false,
    store,
    storeCapacity: creepEnergyCapacity,
    type: 'creep',
    user: userId,
    x: creepIdentity.x,
    y: creepIdentity.y,
  });
}

function insertFixtureRoomObject(roomObjectsCollection, objectId, roomObject) {
  removeFixtureRoomObject(roomObjectsCollection, objectId);

  const nextLokiId = roomObjectsCollection.maxId + 1;

  roomObjectsCollection.data.push({
    $loki: nextLokiId,
    _id: objectId,
    meta: {
      created: Date.now(),
      revision: 0,
      version: 0,
    },
    ...roomObject,
  });
  roomObjectsCollection.idIndex.push(nextLokiId);
  roomObjectsCollection.maxId = nextLokiId;
}

function removeFixtureRoomObject(roomObjectsCollection, objectId) {
  const removedLokiIds = new Set(
    roomObjectsCollection.data
      .filter((roomObject) => roomObject._id === objectId)
      .map((roomObject) => roomObject.$loki),
  );

  roomObjectsCollection.data = roomObjectsCollection.data.filter(
    (roomObject) => roomObject._id !== objectId,
  );
  roomObjectsCollection.idIndex = roomObjectsCollection.idIndex.filter(
    (lokiId) => !removedLokiIds.has(lokiId),
  );
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

function createRunId(fixtureName) {
  const timestamp = new Date()
    .toISOString()
    .replaceAll(':', '')
    .replaceAll('.', '')
    .replace('T', '-')
    .replace('Z', '');

  return `${fixtureName}-${timestamp}-${process.pid}`;
}

export function describeSingleOwnedSpawnFixture() {
  return `fixture=${SINGLE_OWNED_SPAWN_FIXTURE_NAME} user=${SINGLE_OWNED_SPAWN_ACTIVE_BOT.username} room=${SINGLE_OWNED_SPAWN_ACTIVE_BOT.room} spawn=${SINGLE_OWNED_SPAWN_ACTIVE_BOT.spawnName}`;
}

export function describeDefenseCoreThreatFixture() {
  return `fixture=${DEFENSE_CORE_THREAT_FIXTURE_NAME} user=${SINGLE_OWNED_SPAWN_ACTIVE_BOT.username} room=${SINGLE_OWNED_SPAWN_ACTIVE_BOT.room} spawn=${SINGLE_OWNED_SPAWN_ACTIVE_BOT.spawnName} hostile=${DEFENSE_CORE_THREAT_HOSTILE_CREEP.name}`;
}

export function describeDefenseHarmlessScoutFixture() {
  return `fixture=${DEFENSE_HARMLESS_SCOUT_FIXTURE_NAME} user=${SINGLE_OWNED_SPAWN_ACTIVE_BOT.username} room=${SINGLE_OWNED_SPAWN_ACTIVE_BOT.room} spawn=${SINGLE_OWNED_SPAWN_ACTIVE_BOT.spawnName} hostile=${DEFENSE_HARMLESS_SCOUT_HOSTILE_CREEP.name} site=${DEFENSE_DRILL_CONSTRUCTION_SITE.id}`;
}

export function describeDefenseDistantThreatFixture() {
  return `fixture=${DEFENSE_DISTANT_THREAT_FIXTURE_NAME} user=${SINGLE_OWNED_SPAWN_ACTIVE_BOT.username} room=${SINGLE_OWNED_SPAWN_ACTIVE_BOT.room} spawn=${SINGLE_OWNED_SPAWN_ACTIVE_BOT.spawnName} hostile=${DEFENSE_DISTANT_THREAT_HOSTILE_CREEP.name} site=${DEFENSE_DRILL_CONSTRUCTION_SITE.id}`;
}
