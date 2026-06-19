import type { WorkerActionDecision } from '../creeps/worker-decision';

export type GmIntentSource = 'manual-flag' | 'planner';

export interface GmCreepIntent {
  readonly action: string;
  readonly creepName: string;
  readonly error?: string | undefined;
  readonly resultCode?: number | undefined;
  readonly resultName?: string | undefined;
  readonly roomName: string;
  readonly source: GmIntentSource;
  readonly targetId?: string | undefined;
  readonly targetKind?: string | undefined;
  readonly targetRoomName?: string | undefined;
  readonly targetX?: number | undefined;
  readonly targetY?: number | undefined;
  readonly tick: number;
}

export interface GmConsoleApi {
  readonly c: Record<string, string>;
  readonly creeps: Record<string, string>;
  readonly f: Record<string, string>;
  readonly flagNames: Record<string, string>;
  readonly r: Record<string, string>;
  readonly rooms: Record<string, string>;
  readonly s: Record<string, string>;
  readonly spawns: Record<string, string>;
  readonly help: () => string;
  readonly room: (roomName?: string) => string;
  readonly creep: (creepName?: string) => string;
  readonly intent: (creepName?: string) => string;
  readonly watch: (target?: string, options?: GmWatchOptions) => string;
  readonly stop: (watchId?: number | string) => string;
  readonly watches: () => string;
  readonly flags: () => string;
  readonly setRoom: (roomName: string) => string;
}

export interface GmWatchOptions {
  readonly changesOnly?: boolean;
  readonly every?: number;
  readonly kind?: 'creep' | 'flag' | 'room';
  readonly ticks?: number;
}

interface GmConsoleState {
  readonly version: 1;
  defaultRoomName?: string;
  lastRoomName?: string;
  lastIntentByCreep: Record<string, GmCreepIntent>;
  lastWatchOutputById: Record<string, string>;
  lastWatchSampleById: Record<string, string>;
  nextWatchId: number;
  watches: Record<string, GmWatch>;
}

interface GmWatch {
  readonly changesOnly: boolean;
  readonly createdAt: number;
  readonly every: number;
  readonly expiresAt: number;
  readonly id: number;
  readonly kind: 'creep' | 'room';
  readonly target: string;
  lastRun?: number;
}

interface GmRoomSummary {
  readonly constructionProgress: number;
  readonly constructionProgressTotal: number;
  readonly constructionSiteCount: number;
  readonly constructionTypeCounts: Readonly<Record<string, number>>;
  readonly controllerProgress: number | undefined;
  readonly controllerProgressTotal: number | undefined;
  readonly cpuBucket: number;
  readonly cpuUsed: number;
  readonly energyAvailable: number;
  readonly energyCapacity: number;
  readonly hostileCount: number;
  readonly roomName: string;
  readonly ruinEnergy: number;
  readonly shardName: string;
  readonly spawnState: string;
  readonly spawningCount: number;
  readonly tick: number;
  readonly tombstoneEnergy: number;
  readonly droppedEnergy: number;
  readonly controllerLevel: number | undefined;
  readonly ticksToDowngrade: number | undefined;
  readonly workerCount: number;
}

interface GmCreepSummary {
  readonly bodyParts: Readonly<Record<string, number>>;
  readonly creepName: string;
  readonly energy: number;
  readonly freeCapacity: number;
  readonly intent: GmCreepIntent | undefined;
  readonly roomName: string;
  readonly spawning: boolean;
  readonly tick: number;
  readonly ticksToLive: number | undefined;
  readonly workingState: string | undefined;
  readonly x: number | undefined;
  readonly y: number | undefined;
}

interface GmFlagReport {
  readonly flagName: string;
  readonly kind: 'move' | 'room' | 'unknown' | 'watch';
  readonly message: string;
  readonly target?: string;
}

const GM_STATE_KEY = '__gm';
const GM_API_KEY = 'gm';
const GM_VERSION = 1;
const ROOM_WATCH_DEFAULT_EVERY = 10;
const ROOM_WATCH_DEFAULT_TICKS = 100;
const CREEP_WATCH_DEFAULT_EVERY = 1;
const CREEP_WATCH_DEFAULT_TICKS = 50;
const ROOM_WATCH_MIN_EVERY = 5;
const CREEP_WATCH_MIN_EVERY = 1;
const MAX_WATCHES = 3;
const GM_ROOM_FLAG = 'gm:room';

const createStringRecord = <T>(): Record<string, T> => Object.create(null) as Record<string, T>;

const setStringRecordValue = <T>(record: Record<string, T>, key: string, value: T): void => {
  Object.defineProperty(record, key, {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  });
};

export const installGmConsoleTools = (): void => {
  const state = readOrCreateGmConsoleState();
  const gm = readOrCreateGmApi();

  rebuildNameConstants(gm, state);
};

export const runGmConsoleWatches = (writeConsoleLine: (message: string) => void): void => {
  const state = readOrCreateGmConsoleState();

  for (const watch of Object.values(state.watches)) {
    if (Game.time >= watch.expiresAt) {
      delete state.watches[String(watch.id)];
      delete state.lastWatchOutputById[String(watch.id)];
      delete state.lastWatchSampleById[String(watch.id)];
      continue;
    }

    if (watch.lastRun !== undefined && Game.time - watch.lastRun < watch.every) {
      continue;
    }

    try {
      const sample = createWatchSample(watch, state);
      const previousOutput = state.lastWatchOutputById[String(watch.id)];
      watch.lastRun = Game.time;
      state.lastWatchOutputById[String(watch.id)] = sample.normalizedOutput;
      state.lastWatchSampleById[String(watch.id)] = sample.serializedSample;

      if (watch.changesOnly && previousOutput === sample.normalizedOutput) {
        continue;
      }

      writeConsoleLine(sample.output);
    } catch (caughtError) {
      writeConsoleLine(formatError('watch', readCaughtErrorMessage(caughtError)));
      delete state.watches[String(watch.id)];
      delete state.lastWatchOutputById[String(watch.id)];
      delete state.lastWatchSampleById[String(watch.id)];
    }
  }
};

export const applyGmFlagDirectives = (
  writeConsoleLine: (message: string) => void,
): readonly string[] => {
  const moveFlagsByCreepName = new Map<string, Flag[]>();

  for (const flag of Object.values(Game.flags ?? {})) {
    const parsedFlag = parseGmFlagName(flag.name);

    if (parsedFlag.kind !== 'move') {
      continue;
    }

    const flagsForCreep = moveFlagsByCreepName.get(parsedFlag.target) ?? [];
    flagsForCreep.push(flag);
    moveFlagsByCreepName.set(parsedFlag.target, flagsForCreep);
  }

  const manuallyMovedCreepNames: string[] = [];

  for (const [creepName, flags] of moveFlagsByCreepName.entries()) {
    if (flags.length > 1) {
      writeConsoleLine(
        formatError(
          'flags',
          `Multiple gm:move flags for ${creepName}; remove duplicates: ${flags
            .map((flag) => flag.name)
            .join(', ')}`,
        ),
      );
      continue;
    }

    const creep = Game.creeps[creepName];

    if (creep === undefined) {
      writeConsoleLine(
        formatError('flags', `Creep "${creepName}" is not visible for manual move.`),
      );
      continue;
    }

    if (creep.spawning === true) {
      writeConsoleLine(
        formatError('flags', `Creep "${creepName}" is spawning; manual move skipped.`),
      );
      continue;
    }

    const flag = flags[0];
    const resultCode = creep.moveTo(flag);
    recordGmCreepIntent({
      action: 'manualMoveToFlag',
      creepName,
      resultCode,
      resultName: formatReturnCode(resultCode),
      roomName: creep.room.name,
      source: 'manual-flag',
      targetKind: 'flag',
      targetRoomName: flag.pos.roomName,
      targetX: flag.pos.x,
      targetY: flag.pos.y,
      tick: Game.time,
    });
    manuallyMovedCreepNames.push(creepName);
  }

  return manuallyMovedCreepNames;
};

export const recordGmPlannedWorkerIntent = (workerDecision: WorkerActionDecision): void => {
  const creep = Game.creeps[workerDecision.creepName];

  recordGmCreepIntent({
    ...toWorkerIntentTarget(workerDecision),
    action: workerDecision.type,
    creepName: workerDecision.creepName,
    roomName: creep?.room.name ?? 'unknown',
    source: 'planner',
    tick: Game.time,
  });
};

export const recordGmExecutedWorkerIntent = (
  workerDecision: WorkerActionDecision,
  target: RoomObject & { readonly id?: string },
  resultCode: number,
): void => {
  const creep = Game.creeps[workerDecision.creepName];
  const targetPosition = (target as { readonly pos?: RoomPosition }).pos;
  const workerIntentTarget = toWorkerIntentTarget(workerDecision);

  recordGmCreepIntent({
    ...workerIntentTarget,
    action: workerDecision.type,
    creepName: workerDecision.creepName,
    resultCode,
    resultName: formatReturnCode(resultCode),
    roomName: creep?.room.name ?? targetPosition?.roomName ?? 'unknown',
    source: 'planner',
    targetId: target.id ?? workerIntentTarget.targetId,
    targetRoomName: targetPosition?.roomName,
    targetX: targetPosition?.x,
    targetY: targetPosition?.y,
    tick: Game.time,
  });
};

export const recordGmWorkerIntentError = (
  workerDecision: WorkerActionDecision,
  errorMessage: string,
): void => {
  const creep = Game.creeps[workerDecision.creepName];

  recordGmCreepIntent({
    ...toWorkerIntentTarget(workerDecision),
    action: workerDecision.type,
    creepName: workerDecision.creepName,
    error: errorMessage,
    roomName: creep?.room.name ?? 'unknown',
    source: 'planner',
    tick: Game.time,
  });
};

const readOrCreateGmApi = (): GmConsoleApi => {
  const globalScope = globalThis as unknown as Record<string, unknown>;
  const existingApi = globalScope[GM_API_KEY] as GmConsoleApi | undefined;

  if (existingApi !== undefined) {
    return existingApi;
  }

  const gmApi: GmConsoleApi = {
    c: createStringRecord(),
    creep: (creepName?: string) => safelyFormat(() => formatCreepCommand(creepName)),
    creeps: createStringRecord(),
    f: createStringRecord(),
    flagNames: createStringRecord(),
    flags: () => safelyFormat(formatFlagsCommand),
    help: () => formatHelpCommand(),
    intent: (creepName?: string) => safelyFormat(() => formatIntentCommand(creepName)),
    r: createStringRecord(),
    room: (roomName?: string) => safelyFormat(() => formatRoomCommand(roomName)),
    rooms: createStringRecord(),
    s: createStringRecord(),
    setRoom: (roomName: string) => safelyFormat(() => formatSetRoomCommand(roomName)),
    spawns: createStringRecord(),
    stop: (watchId?: number | string) => safelyFormat(() => formatStopCommand(watchId)),
    watch: (target?: string, options?: GmWatchOptions) =>
      safelyFormat(() => formatWatchCommand(target, options)),
    watches: () => safelyFormat(formatWatchesCommand),
  };

  globalScope[GM_API_KEY] = gmApi;

  return gmApi;
};

const readOrCreateGmConsoleState = (): GmConsoleState => {
  const globalScope = globalThis as unknown as Record<string, unknown>;
  const existingState = globalScope[GM_STATE_KEY] as GmConsoleState | undefined;

  if (existingState?.version === GM_VERSION) {
    return existingState;
  }

  const state: GmConsoleState = {
    lastIntentByCreep: createStringRecord(),
    lastWatchOutputById: createStringRecord(),
    lastWatchSampleById: createStringRecord(),
    nextWatchId: 1,
    version: GM_VERSION,
    watches: createStringRecord(),
  };

  globalScope[GM_STATE_KEY] = state;

  return state;
};

const rebuildNameConstants = (gm: GmConsoleApi, state: GmConsoleState): void => {
  replaceNamespaceConstants(gm.rooms, readKnownRoomNames(state));
  replaceNamespaceConstants(gm.r, readKnownRoomNames(state));
  replaceNamespaceConstants(gm.creeps, Object.keys(Game.creeps ?? {}));
  replaceNamespaceConstants(gm.c, Object.keys(Game.creeps ?? {}));
  replaceNamespaceConstants(gm.flagNames, Object.keys(Game.flags ?? {}));
  replaceNamespaceConstants(gm.f, Object.keys(Game.flags ?? {}));
  replaceNamespaceConstants(gm.spawns, Object.keys(Game.spawns ?? {}));
  replaceNamespaceConstants(gm.s, Object.keys(Game.spawns ?? {}));
};

const replaceNamespaceConstants = (
  namespace: Record<string, string>,
  names: readonly string[],
): void => {
  for (const existingName of Object.keys(namespace)) {
    delete namespace[existingName];
  }

  const uniqueNames = [...new Set(names)].sort();
  const aliasCounts = new Map<string, number>();

  for (const name of uniqueNames) {
    const alias = toSanitizedAlias(name);
    aliasCounts.set(alias, (aliasCounts.get(alias) ?? 0) + 1);
  }

  for (const name of uniqueNames) {
    setStringRecordValue(namespace, name, name);

    const alias = toSanitizedAlias(name);

    if (alias !== name && aliasCounts.get(alias) === 1) {
      setStringRecordValue(namespace, alias, name);
    }
  }
};

const readKnownRoomNames = (state: GmConsoleState): readonly string[] => [
  ...Object.keys(Game.rooms ?? {}),
  ...Object.values(Game.spawns ?? {}).map((spawn) => spawn.pos.roomName),
  ...optionalStringArray(state.defaultRoomName),
  ...optionalStringArray(state.lastRoomName),
  ...optionalStringArray(Game.flags?.[GM_ROOM_FLAG]?.pos.roomName),
];

const optionalStringArray = (value: string | undefined): readonly string[] =>
  value === undefined ? [] : [value];

const toSanitizedAlias = (name: string): string => {
  const sanitized = name.replace(/[^0-9A-Za-z_$]/gu, '_');

  if (/^[A-Za-z_$]/u.test(sanitized)) {
    return sanitized;
  }

  return `_${sanitized}`;
};

const safelyFormat = (formatOutput: () => string): string => {
  try {
    return formatOutput();
  } catch (caughtError) {
    return formatError('error', readCaughtErrorMessage(caughtError));
  }
};

const formatHelpCommand = (): string =>
  [
    `[gm:help] shard ${readShardName()} tick ${Game.time}`,
    'Commands',
    '  gm.room(roomName?)',
    '  gm.creep(creepName?)',
    '  gm.intent(creepName?)',
    '  gm.watch(target?, options?)',
    '  gm.stop(watchId?)',
    '  gm.watches()',
    '  gm.flags()',
    '  gm.setRoom(roomName)',
    'Constants',
    '  gm.r.<roomName> / gm.rooms.<roomName>',
    '  gm.c.<creepName> / gm.creeps.<creepName>',
    '  gm.f.<flagAlias> / gm.flagNames.<flagAlias>',
    '  gm.s.<spawnName> / gm.spawns.<spawnName>',
    'Safety',
    '  Read-only commands do not write Memory or mutate creeps.',
    '  gm:move:<creepName> is the only v1 manual control flag.',
  ].join('\n');

const formatRoomCommand = (roomName?: string): string => {
  const state = readOrCreateGmConsoleState();
  const resolvedRoomName = resolveRoomName(roomName, state);
  const roomSummary = summarizeGmRoom(resolvedRoomName);

  state.lastRoomName = resolvedRoomName;
  rebuildNameConstants(readOrCreateGmApi(), state);

  return formatGmRoomSummary(roomSummary);
};

const formatSetRoomCommand = (roomName: string): string => {
  if (Game.rooms[roomName] === undefined) {
    return formatError(
      'setRoom',
      `Room "${roomName}" is not visible. Visible owned rooms: ${formatList(readOwnedVisibleRoomNames())}`,
    );
  }

  const state = readOrCreateGmConsoleState();
  state.defaultRoomName = roomName;
  state.lastRoomName = roomName;
  rebuildNameConstants(readOrCreateGmApi(), state);

  return [
    `[gm:setRoom] ${roomName} @ ${readShardName()} tick ${Game.time}`,
    'Default',
    `  Room: ${roomName}`,
  ].join('\n');
};

const formatCreepCommand = (creepName?: string): string =>
  formatGmCreepSummary(summarizeGmCreep(creepName));

const formatIntentCommand = (creepName?: string): string => {
  const resolvedCreepName = resolveCreepName(creepName);
  const intent = readOrCreateGmConsoleState().lastIntentByCreep[resolvedCreepName];

  if (intent === undefined) {
    return [
      `[gm:intent] ${resolvedCreepName} @ ${readShardName()} tick ${Game.time}`,
      'Intent',
      '  Status: none recorded',
    ].join('\n');
  }

  return formatGmIntent(
    intent,
    `[gm:intent] ${resolvedCreepName} @ ${readShardName()} tick ${Game.time}`,
  );
};

const formatWatchCommand = (target?: string, options: GmWatchOptions = {}): string => {
  const state = readOrCreateGmConsoleState();
  const watchCount = Object.keys(state.watches).length;

  if (watchCount >= MAX_WATCHES) {
    return formatError('watch', `Maximum watch count ${MAX_WATCHES} is already active.`);
  }

  const resolvedTarget = resolveWatchTarget(target, options, state);

  if (resolvedTarget.kind === 'unsupported') {
    return formatError('watch', resolvedTarget.message);
  }

  const defaults = readWatchDefaults(resolvedTarget.kind);
  const every = Math.max(options.every ?? defaults.every, defaults.minimumEvery);
  const ticks = Math.max(options.ticks ?? defaults.ticks, every);
  const id = state.nextWatchId;
  state.nextWatchId += 1;

  state.watches[String(id)] = {
    changesOnly: options.changesOnly === true,
    createdAt: Game.time,
    every,
    expiresAt: Game.time + ticks,
    id,
    kind: resolvedTarget.kind,
    target: resolvedTarget.target,
  };

  return [
    `[gm:watch] started @ ${readShardName()} tick ${Game.time}`,
    'Watch',
    `  Id: ${id}`,
    `  Kind: ${resolvedTarget.kind}`,
    `  Target: ${resolvedTarget.target}`,
    `  Every: ${every}`,
    `  Expires: ${Game.time + ticks}`,
    `  Changes only: ${options.changesOnly === true}`,
  ].join('\n');
};

const formatStopCommand = (watchId?: number | string): string => {
  const state = readOrCreateGmConsoleState();

  if (watchId === undefined) {
    const stoppedCount = Object.keys(state.watches).length;
    state.watches = createStringRecord();
    state.lastWatchOutputById = createStringRecord();
    state.lastWatchSampleById = createStringRecord();

    return [
      `[gm:stop] all @ ${readShardName()} tick ${Game.time}`,
      'Stopped',
      `  Watches: ${stoppedCount}`,
    ].join('\n');
  }

  const watchKey = String(watchId);

  if (state.watches[watchKey] === undefined) {
    return formatError('stop', `Watch "${watchKey}" is not active.`);
  }

  delete state.watches[watchKey];
  delete state.lastWatchOutputById[watchKey];
  delete state.lastWatchSampleById[watchKey];

  return [
    `[gm:stop] #${watchKey} @ ${readShardName()} tick ${Game.time}`,
    'Stopped',
    `  Watch: ${watchKey}`,
  ].join('\n');
};

const formatWatchesCommand = (): string => {
  const watches = Object.values(readOrCreateGmConsoleState().watches).sort(
    (left, right) => left.id - right.id,
  );

  if (watches.length === 0) {
    return [
      `[gm:watches] @ ${readShardName()} tick ${Game.time}`,
      'Watches',
      '  Active: none',
    ].join('\n');
  }

  return [
    `[gm:watches] @ ${readShardName()} tick ${Game.time}`,
    'Watches',
    ...watches.map(
      (watch) =>
        `  #${watch.id}: ${watch.kind} ${watch.target} every=${watch.every} expires=${watch.expiresAt}`,
    ),
  ].join('\n');
};

const formatFlagsCommand = (): string => {
  const flagReports = Object.values(Game.flags ?? {}).map((flag) => formatFlagReport(flag));
  const gmFlagReports = flagReports.filter((flagReport) => flagReport.flagName.startsWith('gm:'));

  if (gmFlagReports.length === 0) {
    return [
      `[gm:flags] @ ${readShardName()} tick ${Game.time}`,
      'Flags',
      '  Recognized: none',
    ].join('\n');
  }

  return [
    `[gm:flags] @ ${readShardName()} tick ${Game.time}`,
    'Flags',
    ...gmFlagReports.map((flagReport) => `  ${flagReport.flagName}: ${flagReport.message}`),
  ].join('\n');
};

const summarizeGmRoom = (roomName: string): GmRoomSummary => {
  const room = readVisibleRoom(roomName);
  const constructionSites = room.find(FIND_CONSTRUCTION_SITES);
  const constructionTypeCounts = constructionSites.reduce<Record<string, number>>(
    (typeCounts, site) => {
      typeCounts[site.structureType] = (typeCounts[site.structureType] ?? 0) + 1;
      return typeCounts;
    },
    {},
  );
  const roomSpawns = Object.values(Game.spawns ?? {}).filter(
    (spawn) => spawn.pos.roomName === roomName,
  );
  const spawningCount = roomSpawns.filter((spawn) => spawn.spawning !== null).length;
  const droppedEnergy = room
    .find(FIND_DROPPED_RESOURCES)
    .filter((resource) => resource.resourceType === RESOURCE_ENERGY)
    .reduce((total, resource) => total + resource.amount, 0);
  const tombstoneEnergy = room
    .find(FIND_TOMBSTONES)
    .reduce((total, tombstone) => total + tombstone.store.getUsedCapacity(RESOURCE_ENERGY), 0);
  const ruinEnergy = room
    .find(FIND_RUINS)
    .reduce((total, ruin) => total + ruin.store.getUsedCapacity(RESOURCE_ENERGY), 0);

  return {
    constructionProgress: constructionSites.reduce((total, site) => total + site.progress, 0),
    constructionProgressTotal: constructionSites.reduce(
      (total, site) => total + site.progressTotal,
      0,
    ),
    constructionSiteCount: constructionSites.length,
    constructionTypeCounts,
    controllerLevel: room.controller?.level,
    controllerProgress: room.controller?.progress,
    controllerProgressTotal: room.controller?.progressTotal,
    cpuBucket: Game.cpu.bucket,
    cpuUsed: Game.cpu.getUsed(),
    droppedEnergy,
    energyAvailable: readRoomEnergyAvailable(room),
    energyCapacity: readRoomEnergyCapacity(room),
    hostileCount: room.find(FIND_HOSTILE_CREEPS).length,
    roomName,
    ruinEnergy,
    shardName: readShardName(),
    spawnState: formatSpawnState(roomSpawns),
    spawningCount,
    tick: Game.time,
    ticksToDowngrade: room.controller?.ticksToDowngrade,
    tombstoneEnergy,
    workerCount: Object.values(Game.creeps ?? {}).filter((creep) => creep.room.name === roomName)
      .length,
  };
};

const summarizeGmCreep = (creepName?: string): GmCreepSummary => {
  const resolvedCreepName = resolveCreepName(creepName);
  const creep = Game.creeps[resolvedCreepName];

  if (creep === undefined) {
    throw new Error(`Creep "${resolvedCreepName}" is not visible.`);
  }

  return {
    bodyParts: countBodyParts(creep),
    creepName: creep.name,
    energy: creep.store.getUsedCapacity(RESOURCE_ENERGY),
    freeCapacity: creep.store.getFreeCapacity(RESOURCE_ENERGY),
    intent: readOrCreateGmConsoleState().lastIntentByCreep[creep.name],
    roomName: creep.room.name,
    spawning: creep.spawning === true,
    tick: Game.time,
    ticksToLive: creep.ticksToLive,
    workingState: formatWorkingState(creep),
    x: creep.pos.x,
    y: creep.pos.y,
  };
};

const formatGmRoomSummary = (roomSummary: GmRoomSummary): string =>
  [
    `[gm:room] ${roomSummary.roomName} @ ${roomSummary.shardName} tick ${formatNumber(roomSummary.tick)}`,
    'Controller',
    `  RCL: ${formatOptionalNumber(roomSummary.controllerLevel)}`,
    `  Progress: ${formatProgress(roomSummary.controllerProgress, roomSummary.controllerProgressTotal)}`,
    `  Downgrade: ${formatOptionalNumber(roomSummary.ticksToDowngrade)}`,
    'Energy',
    `  Available: ${formatNumber(roomSummary.energyAvailable)} / ${formatNumber(roomSummary.energyCapacity)}`,
    `  Spawn: ${roomSummary.spawnState}`,
    'Creeps',
    `  Workers: ${roomSummary.workerCount}`,
    `  Spawning: ${roomSummary.spawningCount}`,
    'Construction',
    `  Sites: ${roomSummary.constructionSiteCount}`,
    `  Progress: ${formatNumber(roomSummary.constructionProgress)} / ${formatNumber(
      roomSummary.constructionProgressTotal,
    )}`,
    `  Types: ${formatTypeCounts(roomSummary.constructionTypeCounts)}`,
    'Threats',
    `  Hostiles: ${roomSummary.hostileCount}`,
    'Resources',
    `  Dropped energy: ${formatNumber(roomSummary.droppedEnergy)}`,
    `  Tombstone energy: ${formatNumber(roomSummary.tombstoneEnergy)}`,
    `  Ruin energy: ${formatNumber(roomSummary.ruinEnergy)}`,
    'Runtime',
    `  CPU: ${formatDecimal(roomSummary.cpuUsed)}`,
    `  Bucket: ${formatNumber(roomSummary.cpuBucket)}`,
  ].join('\n');

const formatGmCreepSummary = (creepSummary: GmCreepSummary): string =>
  [
    `[gm:creep] ${creepSummary.creepName} @ tick ${formatNumber(creepSummary.tick)}`,
    'Location',
    `  Room: ${creepSummary.roomName}`,
    `  Position: ${formatPosition(creepSummary.x, creepSummary.y)}`,
    'Lifecycle',
    `  TTL: ${formatOptionalNumber(creepSummary.ticksToLive)}`,
    `  Spawning: ${creepSummary.spawning}`,
    'Body',
    `  Parts: ${formatBodyParts(creepSummary.bodyParts)}`,
    'Energy',
    `  Carry: ${formatNumber(creepSummary.energy)} / ${formatNumber(
      creepSummary.energy + creepSummary.freeCapacity,
    )}`,
    `  Free: ${formatNumber(creepSummary.freeCapacity)}`,
    'State',
    `  Working: ${creepSummary.workingState ?? '-'}`,
    'Intent',
    ...formatIntentLines(creepSummary.intent),
  ].join('\n');

const formatGmIntent = (intent: GmCreepIntent, header: string): string =>
  [header, 'Intent', ...formatIntentLines(intent)].join('\n');

const formatIntentLines = (intent: GmCreepIntent | undefined): readonly string[] => {
  if (intent === undefined) {
    return ['  Status: none recorded'];
  }

  return [
    `  Tick: ${formatNumber(intent.tick)}`,
    `  Source: ${intent.source}`,
    `  Action: ${intent.action}`,
    `  Target: ${formatIntentTarget(intent)}`,
    `  Result: ${formatIntentResult(intent)}`,
  ];
};

const createWatchSample = (
  watch: GmWatch,
  state: GmConsoleState,
): {
  readonly normalizedOutput: string;
  readonly output: string;
  readonly serializedSample: string;
} => {
  if (watch.kind === 'room') {
    const roomSummary = summarizeGmRoom(watch.target);
    const previousSummary = readPreviousRoomSummary(state.lastWatchSampleById[String(watch.id)]);
    const output = formatGmRoomSummary(roomSummary).replace(
      '[gm:room]',
      `[gm:watch #${watch.id}] Room`,
    );
    const deltaLines = formatRoomDeltaLines(previousSummary, roomSummary);

    return {
      normalizedOutput: JSON.stringify(normalizeRoomSummary(roomSummary)),
      output: withDeltaLines(output, deltaLines),
      serializedSample: JSON.stringify(roomSummary),
    };
  }

  const creepSummary = summarizeGmCreep(watch.target);
  const previousSummary = readPreviousCreepSummary(state.lastWatchSampleById[String(watch.id)]);
  const output = formatGmCreepSummary(creepSummary).replace(
    '[gm:creep]',
    `[gm:watch #${watch.id}] Creep`,
  );
  const deltaLines = formatCreepDeltaLines(previousSummary, creepSummary);
  const serializedSample = JSON.stringify(creepSummary);

  return {
    normalizedOutput: JSON.stringify(normalizeCreepSummary(creepSummary)),
    output: withDeltaLines(output, deltaLines),
    serializedSample,
  };
};

const normalizeRoomSummary = (roomSummary: GmRoomSummary): Readonly<Record<string, unknown>> => ({
  constructionProgress: roomSummary.constructionProgress,
  constructionProgressTotal: roomSummary.constructionProgressTotal,
  constructionSiteCount: roomSummary.constructionSiteCount,
  constructionTypeCounts: roomSummary.constructionTypeCounts,
  controllerLevel: roomSummary.controllerLevel,
  controllerProgress: roomSummary.controllerProgress,
  controllerProgressTotal: roomSummary.controllerProgressTotal,
  energyAvailable: roomSummary.energyAvailable,
  energyCapacity: roomSummary.energyCapacity,
  hostileCount: roomSummary.hostileCount,
  roomName: roomSummary.roomName,
  spawningCount: roomSummary.spawningCount,
  ticksToDowngrade: roomSummary.ticksToDowngrade,
  workerCount: roomSummary.workerCount,
});

const normalizeCreepSummary = (
  creepSummary: GmCreepSummary,
): Readonly<Record<string, unknown>> => ({
  action: creepSummary.intent?.action,
  energy: creepSummary.energy,
  freeCapacity: creepSummary.freeCapacity,
  resultCode: creepSummary.intent?.resultCode,
  roomName: creepSummary.roomName,
  source: creepSummary.intent?.source,
  targetId: creepSummary.intent?.targetId,
  targetKind: creepSummary.intent?.targetKind,
  targetRoomName: creepSummary.intent?.targetRoomName,
  targetX: creepSummary.intent?.targetX,
  targetY: creepSummary.intent?.targetY,
  workingState: creepSummary.workingState,
  x: creepSummary.x,
  y: creepSummary.y,
});

const withDeltaLines = (output: string, deltaLines: readonly string[]): string => {
  const lines = output.split('\n');
  const [header, ...bodyLines] = lines;

  return [
    header,
    'Delta',
    ...(deltaLines.length === 0 ? ['  No previous sample'] : deltaLines),
    ...bodyLines,
  ].join('\n');
};

const formatRoomDeltaLines = (
  previousRoomSummary: GmRoomSummary | undefined,
  roomSummary: GmRoomSummary,
): readonly string[] => {
  if (previousRoomSummary === undefined) {
    return [];
  }

  return [
    formatDeltaLine(
      'Controller progress',
      previousRoomSummary.controllerProgress,
      roomSummary.controllerProgress,
    ),
    formatDeltaLine(
      'Energy available',
      previousRoomSummary.energyAvailable,
      roomSummary.energyAvailable,
    ),
    formatDeltaLine(
      'Construction progress',
      previousRoomSummary.constructionProgress,
      roomSummary.constructionProgress,
    ),
  ].filter((line): line is string => line !== undefined);
};

const formatCreepDeltaLines = (
  previousCreepSummary: GmCreepSummary | undefined,
  creepSummary: GmCreepSummary,
): readonly string[] => {
  if (previousCreepSummary === undefined) {
    return [];
  }

  const lines: string[] = [];

  if (
    previousCreepSummary.roomName !== creepSummary.roomName ||
    previousCreepSummary.x !== creepSummary.x ||
    previousCreepSummary.y !== creepSummary.y
  ) {
    lines.push(
      `  Position: ${previousCreepSummary.roomName}${formatPosition(
        previousCreepSummary.x,
        previousCreepSummary.y,
      )} -> ${creepSummary.roomName}${formatPosition(creepSummary.x, creepSummary.y)}`,
    );
  }

  if (previousCreepSummary.energy !== creepSummary.energy) {
    lines.push(`  Energy: ${formatSignedDelta(creepSummary.energy - previousCreepSummary.energy)}`);
  }

  if (previousCreepSummary.intent?.action !== creepSummary.intent?.action) {
    lines.push(
      `  Intent action: ${previousCreepSummary.intent?.action ?? '-'} -> ${creepSummary.intent?.action ?? '-'}`,
    );
  }

  return lines;
};

const readPreviousRoomSummary = (
  serializedSummary: string | undefined,
): GmRoomSummary | undefined => {
  if (serializedSummary === undefined) {
    return undefined;
  }

  return tryParseJson<GmRoomSummary>(serializedSummary);
};

const readPreviousCreepSummary = (
  serializedSummary: string | undefined,
): GmCreepSummary | undefined => {
  if (serializedSummary === undefined) {
    return undefined;
  }

  return tryParseJson<GmCreepSummary>(serializedSummary);
};

const resolveRoomName = (explicitRoomName: string | undefined, state: GmConsoleState): string => {
  if (explicitRoomName !== undefined) {
    readVisibleRoom(explicitRoomName);
    return explicitRoomName;
  }

  for (const candidateRoomName of [
    state.defaultRoomName,
    Game.flags?.[GM_ROOM_FLAG]?.pos.roomName,
  ]) {
    if (candidateRoomName !== undefined && Game.rooms[candidateRoomName] !== undefined) {
      return candidateRoomName;
    }
  }

  const ownedVisibleRoomNames = readOwnedVisibleRoomNames();

  if (ownedVisibleRoomNames.length === 1) {
    return ownedVisibleRoomNames[0];
  }

  if (state.lastRoomName !== undefined && Game.rooms[state.lastRoomName] !== undefined) {
    return state.lastRoomName;
  }

  throw new Error(
    `No default room resolved. Visible owned rooms: ${formatList(
      ownedVisibleRoomNames,
    )}. Use gm.setRoom(roomName) or place gm:room.`,
  );
};

const resolveCreepName = (creepName: string | undefined): string => {
  if (creepName !== undefined) {
    return creepName;
  }

  const creepNames = Object.keys(Game.creeps ?? {}).sort();

  if (creepNames.length === 1) {
    return creepNames[0];
  }

  throw new Error(`Creep name required. Visible creeps: ${formatList(creepNames)}.`);
};

const resolveWatchTarget = (
  target: string | undefined,
  options: GmWatchOptions,
  state: GmConsoleState,
):
  | { readonly kind: 'creep' | 'room'; readonly target: string }
  | { readonly kind: 'unsupported'; readonly message: string } => {
  if (target === undefined) {
    return { kind: 'room', target: resolveRoomName(undefined, state) };
  }

  if (options.kind === 'flag') {
    return {
      kind: 'unsupported',
      message: 'Flag watches are not supported in v1; use room or creep watches.',
    };
  }

  if (options.kind === 'room') {
    return { kind: 'room', target: resolveRoomName(target, state) };
  }

  if (options.kind === 'creep') {
    if (Game.creeps[target] === undefined) {
      return { kind: 'unsupported', message: `Target "${target}" is not a visible room or creep.` };
    }

    return { kind: 'creep', target };
  }

  const matchesRoom = Game.rooms[target] !== undefined;
  const matchesCreep = Game.creeps[target] !== undefined;
  const matchesFlag = Game.flags?.[target] !== undefined;

  if (matchesFlag) {
    return {
      kind: 'unsupported',
      message: 'Flag watches are not supported in v1; use room or creep watches.',
    };
  }

  if (matchesRoom && matchesCreep) {
    return { kind: 'unsupported', message: `Target "${target}" is ambiguous; pass options.kind.` };
  }

  if (matchesRoom) {
    return { kind: 'room', target };
  }

  if (matchesCreep) {
    return { kind: 'creep', target };
  }

  return { kind: 'unsupported', message: `Target "${target}" is not a visible room or creep.` };
};

const readWatchDefaults = (
  kind: 'creep' | 'room',
): { readonly every: number; readonly minimumEvery: number; readonly ticks: number } =>
  kind === 'room'
    ? {
        every: ROOM_WATCH_DEFAULT_EVERY,
        minimumEvery: ROOM_WATCH_MIN_EVERY,
        ticks: ROOM_WATCH_DEFAULT_TICKS,
      }
    : {
        every: CREEP_WATCH_DEFAULT_EVERY,
        minimumEvery: CREEP_WATCH_MIN_EVERY,
        ticks: CREEP_WATCH_DEFAULT_TICKS,
      };

const readVisibleRoom = (roomName: string): Room => {
  const room = Game.rooms[roomName];

  if (room === undefined) {
    throw new Error(
      `Room "${roomName}" is not visible. Visible owned rooms: ${formatList(readOwnedVisibleRoomNames())}.`,
    );
  }

  return room;
};

const readOwnedVisibleRoomNames = (): readonly string[] =>
  Object.values(Game.rooms ?? {})
    .filter((room) => room.controller?.my === true)
    .map((room) => room.name)
    .sort();

const formatFlagReport = (flag: Flag): GmFlagReport => {
  const parsedFlag = parseGmFlagName(flag.name);

  switch (parsedFlag.kind) {
    case 'room':
      return {
        flagName: flag.name,
        kind: 'room',
        message: `default room ${flag.pos.roomName}`,
      };

    case 'watch':
      return {
        flagName: flag.name,
        kind: 'watch',
        message: `watch creep ${parsedFlag.target}`,
        target: parsedFlag.target,
      };

    case 'move':
      return {
        flagName: flag.name,
        kind: 'move',
        message: `manual move creep ${parsedFlag.target} to ${flag.pos.roomName}(${flag.pos.x},${flag.pos.y})`,
        target: parsedFlag.target,
      };

    case 'unknown':
      return {
        flagName: flag.name,
        kind: 'unknown',
        message: 'unrecognized gm flag; ignored',
      };
  }
};

const parseGmFlagName = (
  flagName: string,
):
  | { readonly kind: 'move'; readonly target: string }
  | { readonly kind: 'room' }
  | { readonly kind: 'unknown' }
  | { readonly kind: 'watch'; readonly target: string } => {
  if (flagName === GM_ROOM_FLAG) {
    return { kind: 'room' };
  }

  if (flagName.startsWith('gm:watch:')) {
    return { kind: 'watch', target: flagName.slice('gm:watch:'.length) };
  }

  if (flagName.startsWith('gm:move:')) {
    return { kind: 'move', target: flagName.slice('gm:move:'.length) };
  }

  return { kind: 'unknown' };
};

const recordGmCreepIntent = (intent: GmCreepIntent): void => {
  setStringRecordValue(readOrCreateGmConsoleState().lastIntentByCreep, intent.creepName, intent);
};

const toWorkerIntentTarget = (
  workerDecision: WorkerActionDecision,
): Pick<GmCreepIntent, 'targetId' | 'targetKind'> => {
  switch (workerDecision.type) {
    case 'buildConstructionSite':
      return { targetId: workerDecision.constructionSiteId, targetKind: 'constructionSite' };

    case 'harvestSource':
      return { targetId: workerDecision.sourceId, targetKind: 'source' };

    case 'pickupEnergy':
      return { targetId: workerDecision.resourceId, targetKind: 'resource' };

    case 'refillEnergyStructure':
      return { targetId: workerDecision.structureId, targetKind: 'energyStructure' };

    case 'repairStructure':
      return { targetId: workerDecision.structureId, targetKind: 'structure' };

    case 'upgradeController':
      return { targetId: workerDecision.controllerId, targetKind: 'controller' };

    case 'withdrawEnergy':
      return { targetId: workerDecision.structureId, targetKind: 'energyWithdrawal' };
  }
};

const readRoomEnergyAvailable = (room: Room): number =>
  typeof room.energyAvailable === 'number'
    ? room.energyAvailable
    : Object.values(Game.spawns ?? {})
        .filter((spawn) => spawn.pos.roomName === room.name)
        .reduce((total, spawn) => total + spawn.store.getUsedCapacity(RESOURCE_ENERGY), 0);

const readRoomEnergyCapacity = (room: Room): number =>
  typeof room.energyCapacityAvailable === 'number'
    ? room.energyCapacityAvailable
    : Object.values(Game.spawns ?? {})
        .filter((spawn) => spawn.pos.roomName === room.name)
        .reduce((total, spawn) => total + spawn.store.getCapacity(RESOURCE_ENERGY), 0);

const formatSpawnState = (roomSpawns: readonly StructureSpawn[]): string => {
  if (roomSpawns.length === 0) {
    return 'none';
  }

  const busySpawns = roomSpawns.filter((spawn) => spawn.spawning !== null);

  if (busySpawns.length === 0) {
    return 'idle';
  }

  return busySpawns.map((spawn) => `${spawn.name}=spawning`).join(', ');
};

const countBodyParts = (creep: Creep): Readonly<Record<string, number>> =>
  creep.body.reduce<Record<string, number>>((bodyParts, bodyPart) => {
    bodyParts[bodyPart.type] = (bodyParts[bodyPart.type] ?? 0) + 1;
    return bodyParts;
  }, {});

const formatBodyParts = (bodyParts: Readonly<Record<string, number>>): string => {
  const entries = Object.entries(bodyParts).sort(([leftType], [rightType]) =>
    leftType.localeCompare(rightType),
  );

  if (entries.length === 0) {
    return '-';
  }

  return entries
    .map(([bodyPartType, count]) => `${count} ${bodyPartType.toUpperCase()}`)
    .join(' / ');
};

const formatWorkingState = (creep: Creep): string | undefined => {
  const creepWithMemory = creep as unknown as { readonly memory?: Record<string, unknown> };

  if (typeof creepWithMemory.memory?.['role'] === 'string') {
    return `${creepWithMemory.memory['role']}`;
  }

  if (typeof creepWithMemory.memory?.['working'] === 'boolean') {
    return creepWithMemory.memory['working'] ? 'working' : 'harvesting';
  }

  return undefined;
};

const formatIntentTarget = (intent: GmCreepIntent): string => {
  const parts = [intent.targetKind, intent.targetId].filter(
    (part): part is string => part !== undefined && part.length > 0,
  );
  const targetName = parts.length === 0 ? '-' : parts.join(' ');

  if (
    intent.targetRoomName !== undefined &&
    intent.targetX !== undefined &&
    intent.targetY !== undefined
  ) {
    return `${targetName} @ ${intent.targetRoomName}(${intent.targetX},${intent.targetY})`;
  }

  return targetName;
};

const formatIntentResult = (intent: GmCreepIntent): string => {
  if (intent.error !== undefined) {
    return `ERROR ${intent.error}`;
  }

  if (intent.resultName !== undefined) {
    return intent.resultName;
  }

  return 'planned';
};

const formatError = (scope: string, message: string): string =>
  [
    `[gm:${scope}] error @ ${readShardName()} tick ${Game.time}`,
    'Error',
    `  Message: ${message}`,
  ].join('\n');

const readShardName = (): string => Game.shard?.name ?? 'shard0';

const readCaughtErrorMessage = (caughtError: unknown): string => {
  if (caughtError instanceof Error) {
    return caughtError.message;
  }

  return String(caughtError);
};

const formatList = (items: readonly string[]): string =>
  items.length === 0 ? 'none' : items.join(', ');

const formatNumber = (value: number): string => value.toLocaleString('en-US');

const formatOptionalNumber = (value: number | undefined): string =>
  value === undefined ? '-' : formatNumber(value);

const formatDecimal = (value: number): string => value.toFixed(2);

const formatProgress = (
  progress: number | undefined,
  progressTotal: number | undefined,
): string => {
  if (progress === undefined || progressTotal === undefined) {
    return '-';
  }

  return `${formatNumber(progress)} / ${formatNumber(progressTotal)}`;
};

const formatTypeCounts = (typeCounts: Readonly<Record<string, number>>): string => {
  const entries = Object.entries(typeCounts).sort(([leftType], [rightType]) =>
    leftType.localeCompare(rightType),
  );

  if (entries.length === 0) {
    return '-';
  }

  return entries.map(([structureType, count]) => `${structureType}=${count}`).join(' ');
};

const formatPosition = (x: number | undefined, y: number | undefined): string => {
  if (x === undefined || y === undefined) {
    return '-';
  }

  return `(${x},${y})`;
};

const formatDeltaLine = (
  label: string,
  previousValue: number | undefined,
  currentValue: number | undefined,
): string | undefined => {
  if (previousValue === undefined || currentValue === undefined) {
    return undefined;
  }

  const delta = currentValue - previousValue;

  if (delta === 0) {
    return undefined;
  }

  return `  ${label}: ${formatSignedDelta(delta)}`;
};

const formatSignedDelta = (delta: number): string =>
  delta > 0 ? `+${formatNumber(delta)}` : formatNumber(delta);

const tryParseJson = <T>(serializedValue: string): T | undefined => {
  try {
    return JSON.parse(serializedValue) as T;
  } catch {
    return undefined;
  }
};

const formatReturnCode = (returnCode: number): string => {
  const knownCodes: readonly [string, number | undefined][] = [
    ['OK', readGlobalNumber('OK')],
    ['ERR_NOT_OWNER', readGlobalNumber('ERR_NOT_OWNER')],
    ['ERR_NO_PATH', readGlobalNumber('ERR_NO_PATH')],
    ['ERR_NAME_EXISTS', readGlobalNumber('ERR_NAME_EXISTS')],
    ['ERR_BUSY', readGlobalNumber('ERR_BUSY')],
    ['ERR_NOT_FOUND', readGlobalNumber('ERR_NOT_FOUND')],
    ['ERR_NOT_ENOUGH_ENERGY', readGlobalNumber('ERR_NOT_ENOUGH_ENERGY')],
    ['ERR_INVALID_TARGET', readGlobalNumber('ERR_INVALID_TARGET')],
    ['ERR_FULL', readGlobalNumber('ERR_FULL')],
    ['ERR_NOT_IN_RANGE', readGlobalNumber('ERR_NOT_IN_RANGE')],
    ['ERR_INVALID_ARGS', readGlobalNumber('ERR_INVALID_ARGS')],
    ['ERR_TIRED', readGlobalNumber('ERR_TIRED')],
    ['ERR_NO_BODYPART', readGlobalNumber('ERR_NO_BODYPART')],
  ];
  const matchingCode = knownCodes.find(([, code]) => code === returnCode);

  return matchingCode === undefined ? String(returnCode) : matchingCode[0];
};

const readGlobalNumber = (key: string): number | undefined => {
  const value = (globalThis as unknown as Record<string, unknown>)[key];

  return typeof value === 'number' ? value : undefined;
};
