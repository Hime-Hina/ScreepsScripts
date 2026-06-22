#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { pathToFileURL } from 'node:url';

import { reportCommandFailure } from './command-failure.mjs';
import { readMainScreepsConfig, readMainScreepsConfigFrom } from './config.mjs';
import { hashModuleSet } from './module-set.mjs';
import {
  createRoomGeometrySnapshot,
  formatRoomGeometryReport,
  normalizeRoomGeometryFixture,
  RoomGeometryLayoutError,
} from './room-geometry-layout.mjs';
import {
  readLiveAccountIdentity,
  readRemoteModuleSet,
  readRoomObjects,
  readRoomStatus,
  readRoomTerrainText,
} from './screeps-api.mjs';

export class RoomGeometryLayoutCommandError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RoomGeometryLayoutCommandError';
  }
}

export const checkRoomGeometryLayoutSimulator = async (
  commandArguments = process.argv.slice(2),
) => {
  const geometryRequest = parseRoomGeometryLayoutRequest(commandArguments);

  if (geometryRequest.fixturePath !== null) {
    await printFixtureRoomGeometryReport(geometryRequest);
    return;
  }

  const screepsConfig = await readMainScreepsConfig();
  await printLiveRoomGeometryReport(screepsConfig, geometryRequest);
};

export const checkRoomGeometryLayoutSimulatorFrom = async (workspacePath, commandArguments) => {
  const geometryRequest = parseRoomGeometryLayoutRequest(commandArguments);

  if (geometryRequest.fixturePath !== null) {
    await printFixtureRoomGeometryReport(geometryRequest);
    return;
  }

  const screepsConfig = await readMainScreepsConfigFrom(workspacePath);
  await printLiveRoomGeometryReport(screepsConfig, geometryRequest);
};

export const parseRoomGeometryLayoutRequest = (commandArguments) => {
  let fixturePath = null;
  let padding = 2;
  let roomName = null;
  let shardName = null;

  for (let argumentIndex = 0; argumentIndex < commandArguments.length; argumentIndex += 1) {
    const commandArgument = commandArguments[argumentIndex];

    if (commandArgument === '--') {
      continue;
    }

    if (commandArgument === '--fixture') {
      fixturePath = readFollowingArgument(commandArguments, argumentIndex, '--fixture');
      argumentIndex += 1;
      continue;
    }

    if (commandArgument === '--padding') {
      const paddingText = readFollowingArgument(commandArguments, argumentIndex, '--padding');
      padding = parsePaddingValue(paddingText);
      argumentIndex += 1;
      continue;
    }

    if (commandArgument === '--room') {
      roomName = readFollowingArgument(commandArguments, argumentIndex, '--room');
      argumentIndex += 1;
      continue;
    }

    if (commandArgument === '--shard') {
      shardName = readFollowingArgument(commandArguments, argumentIndex, '--shard');
      argumentIndex += 1;
      continue;
    }

    throw new RoomGeometryLayoutCommandError(`Unknown argument "${commandArgument}".`);
  }

  if (fixturePath !== null) {
    return {
      fixturePath,
      padding,
      roomName,
      shardName,
    };
  }

  if (shardName === null) {
    throw new RoomGeometryLayoutCommandError('Missing --shard <name>.');
  }

  if (roomName === null) {
    throw new RoomGeometryLayoutCommandError('Missing --room <name>.');
  }

  return {
    fixturePath: null,
    padding,
    roomName,
    shardName,
  };
};

const printFixtureRoomGeometryReport = async (geometryRequest) => {
  const fixtureSnapshot = normalizeRoomGeometryFixture(
    JSON.parse(await readFile(geometryRequest.fixturePath, 'utf8')),
  );
  const roomGeometrySnapshot = createRoomGeometrySnapshot({
    ownedUserId: fixtureSnapshot.accountId ?? '',
    padding: geometryRequest.padding,
    roomName: fixtureSnapshot.roomName,
    roomObjects: fixtureSnapshot.roomObjects,
    terrainText: fixtureSnapshot.terrainText,
  });

  console.log(
    formatRoomGeometryReport(
      {
        branch: fixtureSnapshot.branch ?? '-',
        moduleHash: fixtureSnapshot.moduleHash ?? '-',
        shardName: fixtureSnapshot.shardName ?? geometryRequest.shardName ?? '-',
        sourceLabel: `fixture:${basename(geometryRequest.fixturePath)}`,
        status: fixtureSnapshot.status ?? 'fixture',
      },
      roomGeometrySnapshot,
    ),
  );
};

const printLiveRoomGeometryReport = async (screepsConfig, geometryRequest) => {
  const accountIdentity = await readLiveAccountIdentity(screepsConfig);
  const roomStatus = await readRoomStatus(
    screepsConfig,
    geometryRequest.shardName,
    geometryRequest.roomName,
  );
  const roomTerrainText = await readRoomTerrainText(
    screepsConfig,
    geometryRequest.shardName,
    geometryRequest.roomName,
  );
  const roomObjects = await readRoomObjects(
    screepsConfig,
    geometryRequest.shardName,
    geometryRequest.roomName,
  );
  const remoteModules = await readRemoteModuleSet(screepsConfig);
  const roomGeometrySnapshot = createRoomGeometrySnapshot({
    ownedUserId: accountIdentity.accountId,
    padding: geometryRequest.padding,
    roomName: geometryRequest.roomName,
    roomObjects,
    terrainText: roomTerrainText,
  });

  console.log(
    formatRoomGeometryReport(
      {
        branch: screepsConfig.branch,
        moduleHash: hashModuleSet(remoteModules),
        shardName: geometryRequest.shardName,
        sourceLabel: 'live',
        status: roomStatus,
      },
      roomGeometrySnapshot,
    ),
  );
};

const parsePaddingValue = (paddingText) => {
  const paddingValue = Number.parseInt(paddingText, 10);

  if (!Number.isInteger(paddingValue) || paddingValue < 0) {
    throw new RoomGeometryLayoutCommandError('--padding must be a non-negative integer.');
  }

  return paddingValue;
};

const readFollowingArgument = (commandArguments, argumentIndex, argumentName) => {
  const argumentText = commandArguments[argumentIndex + 1];

  if (argumentText === undefined || argumentText.startsWith('--')) {
    throw new RoomGeometryLayoutCommandError(`Missing value after ${argumentName}.`);
  }

  return argumentText;
};

const normalizeGeometryCommandError = (caughtError) => {
  if (caughtError instanceof SyntaxError) {
    return new RoomGeometryLayoutCommandError('Room geometry fixture is not valid JSON.');
  }

  if (
    caughtError instanceof RoomGeometryLayoutCommandError ||
    caughtError instanceof RoomGeometryLayoutError
  ) {
    return caughtError;
  }

  return caughtError;
};

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await checkRoomGeometryLayoutSimulator();
  } catch (caughtError) {
    reportCommandFailure(
      'room-geometry-layout:screeps',
      normalizeGeometryCommandError(caughtError),
    );
  }
}
