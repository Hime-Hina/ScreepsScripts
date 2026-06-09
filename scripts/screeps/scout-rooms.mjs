#!/usr/bin/env node

import { pathToFileURL } from 'node:url';

import { reportCommandFailure } from './command-failure.mjs';
import { readMainScreepsConfig } from './config.mjs';
import {
  decodeTerrainString,
  formatStartingRoomScoutReport,
  getCardinalNeighborRoomNames,
  parseRoomScoutRequest,
  rankStartingRoomCandidates,
} from './room-scout.mjs';
import { readRoomObjects, readRoomStatus, readRoomTerrainText } from './screeps-api.mjs';

export const scoutScreepsRooms = async (commandArguments = process.argv.slice(2)) => {
  const scoutRequest = parseRoomScoutRequest(commandArguments);
  const screepsConfig = await readMainScreepsConfig();
  const roomSnapshots = await readCandidateRoomSnapshots(screepsConfig, scoutRequest);
  const candidateEvaluations = rankStartingRoomCandidates(roomSnapshots);

  console.log(
    formatStartingRoomScoutReport({
      branch: screepsConfig.branch,
      candidateEvaluations,
      roomCount: roomSnapshots.length,
      shardName: scoutRequest.shardName,
    }),
  );
};

const readCandidateRoomSnapshots = async (screepsConfig, scoutRequest) => {
  const neighborRoomNames = collectNeighborRoomNames(scoutRequest.roomNames);
  const neighborSnapshotsByRoomName = new Map();
  const candidateRoomSnapshots = [];

  for (const neighborRoomName of neighborRoomNames) {
    neighborSnapshotsByRoomName.set(
      neighborRoomName,
      await readNeighborRoomSnapshot(screepsConfig, scoutRequest.shardName, neighborRoomName),
    );
  }

  for (const roomName of scoutRequest.roomNames) {
    const neighborSnapshots = getCardinalNeighborRoomNames(roomName)
      .map((neighborRoomName) => neighborSnapshotsByRoomName.get(neighborRoomName))
      .filter((neighborSnapshot) => neighborSnapshot !== undefined);

    candidateRoomSnapshots.push(
      await readCandidateRoomSnapshot(
        screepsConfig,
        scoutRequest.shardName,
        roomName,
        neighborSnapshots,
      ),
    );
  }

  return candidateRoomSnapshots;
};

const readCandidateRoomSnapshot = async (screepsConfig, shardName, roomName, neighborSnapshots) => {
  try {
    const roomStatus = await readRoomStatus(screepsConfig, shardName, roomName);
    const roomObjects = await readRoomObjects(screepsConfig, shardName, roomName);
    const terrainText = await readRoomTerrainText(screepsConfig, shardName, roomName);

    return {
      neighborSnapshots,
      objects: roomObjects,
      roomName,
      status: roomStatus,
      terrain: decodeTerrainString(terrainText),
    };
  } catch {
    return {
      neighborSnapshots: [],
      objects: [],
      roomName,
      status: 'api-error',
      terrain: decodeTerrainString('1'.repeat(2500)),
    };
  }
};

const readNeighborRoomSnapshot = async (screepsConfig, shardName, roomName) => {
  try {
    return {
      objects: await readRoomObjects(screepsConfig, shardName, roomName),
      roomName,
      status: await readRoomStatus(screepsConfig, shardName, roomName),
    };
  } catch {
    return {
      objects: [],
      roomName,
      status: 'unknown',
    };
  }
};

const collectNeighborRoomNames = (roomNames) => {
  const candidateRoomNames = new Set(roomNames);
  const neighborRoomNames = new Set();

  for (const roomName of roomNames) {
    for (const neighborRoomName of getCardinalNeighborRoomNames(roomName)) {
      if (!candidateRoomNames.has(neighborRoomName)) {
        neighborRoomNames.add(neighborRoomName);
      }
    }
  }

  return [...neighborRoomNames].sort();
};

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await scoutScreepsRooms();
  } catch (caughtError) {
    reportCommandFailure('scout:screeps', caughtError);
  }
}
