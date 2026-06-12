#!/usr/bin/env node

import { pathToFileURL } from 'node:url';

import { reportCommandFailure } from './command-failure.mjs';
import {
  placePtrSpawn,
  readPtrAccountStatus,
  readPtrOverview,
  readPtrRoomObjects,
  readPtrRoomStatus,
  readPtrShardInfo,
} from './ptr-api.mjs';
import { readPtrScreepsConfigFrom } from './ptr-config.mjs';

const PTR_MAIN_ROOM_TARGET = Object.freeze({
  roomName: 'W51N21',
  shardName: 'shard1',
  spawnName: 'Spawn1',
  x: 35,
  y: 23,
});

export const foundPtrMainRoom = async () => foundPtrMainRoomFrom(process.cwd());

export const foundPtrMainRoomFrom = async (workspacePath) => {
  const ptrConfig = await readPtrScreepsConfigFrom(workspacePath);
  const accountStatus = await readPtrAccountStatus(ptrConfig);
  const overview = await readPtrOverview(ptrConfig);
  const shardInfo = await readPtrShardInfo(ptrConfig);
  const ownedRooms = readOwnedRoomsFromOverview(overview);
  const targetOwnedRoom = ownedRooms.find(
    (ownedRoom) =>
      ownedRoom.roomName === PTR_MAIN_ROOM_TARGET.roomName &&
      ownedRoom.shardName === PTR_MAIN_ROOM_TARGET.shardName,
  );

  logPtrProbeSummary(accountStatus, shardInfo, ownedRooms);

  if (targetOwnedRoom !== undefined) {
    const roomObjects = await readPtrRoomObjects(
      ptrConfig,
      PTR_MAIN_ROOM_TARGET.shardName,
      PTR_MAIN_ROOM_TARGET.roomName,
    );

    assertTargetSpawnExists(roomObjects);
    console.log(
      `[found:ptr-room:screeps] status=already-founded room=${formatRoom(
        PTR_MAIN_ROOM_TARGET,
      )} spawn=${PTR_MAIN_ROOM_TARGET.spawnName} x=${PTR_MAIN_ROOM_TARGET.x} y=${
        PTR_MAIN_ROOM_TARGET.y
      }`,
    );
    return;
  }

  if (ownedRooms.length > 0) {
    throw new Error(
      `PTR already has owned room ${formatRoom(
        ownedRooms[0],
      )}; refusing to found ${formatRoom(PTR_MAIN_ROOM_TARGET)}.`,
    );
  }

  const roomStatus = await readPtrRoomStatus(
    ptrConfig,
    PTR_MAIN_ROOM_TARGET.shardName,
    PTR_MAIN_ROOM_TARGET.roomName,
  );

  if (!roomStatusAllowsSpawn(roomStatus)) {
    throw new Error(
      `PTR target room ${formatRoom(PTR_MAIN_ROOM_TARGET)} is not spawnable; status=${roomStatus}.`,
    );
  }

  const placeSpawnResult = await placePtrSpawn(ptrConfig, PTR_MAIN_ROOM_TARGET);
  const roomObjects = await readPtrRoomObjects(
    ptrConfig,
    PTR_MAIN_ROOM_TARGET.shardName,
    PTR_MAIN_ROOM_TARGET.roomName,
  );

  assertTargetSpawnExists(roomObjects);
  console.log(
    `[found:ptr-room:screeps] status=spawn-placed room=${formatRoom(
      PTR_MAIN_ROOM_TARGET,
    )} spawn=${PTR_MAIN_ROOM_TARGET.spawnName} x=${PTR_MAIN_ROOM_TARGET.x} y=${
      PTR_MAIN_ROOM_TARGET.y
    } newbie=${String(placeSpawnResult.newbie === true)}`,
  );
};

const logPtrProbeSummary = (accountStatus, shardInfo, ownedRooms) => {
  const username =
    typeof accountStatus.username === 'string' && accountStatus.username.trim() !== ''
      ? accountStatus.username.trim()
      : 'unknown';
  const cpu = typeof accountStatus.cpu === 'number' ? String(accountStatus.cpu) : 'unknown';
  const shardNames = readShardNames(shardInfo);
  const ownedRoomNames = ownedRooms.map(formatRoom);

  console.log(
    `[found:ptr-room:screeps] ptrAccount=${username} cpu=${cpu} shards=${formatList(
      shardNames,
    )} ownedRooms=${formatList(ownedRoomNames)}`,
  );
};

const readOwnedRoomsFromOverview = (overview) => {
  const ownedRooms = [];

  for (const [shardName, shardOverview] of iterateOverviewShardEntries(overview)) {
    appendOwnedRooms(ownedRooms, shardName, shardOverview);
  }

  return ownedRooms.sort((leftRoom, rightRoom) =>
    formatRoom(leftRoom).localeCompare(formatRoom(rightRoom)),
  );
};

const iterateOverviewShardEntries = (overview) => {
  if (isPlainObject(overview.shards)) {
    return Object.entries(overview.shards).filter(([fieldName, fieldValue]) =>
      isOverviewShardEntry(fieldName, fieldValue),
    );
  }

  return Object.entries(overview).filter(([fieldName, fieldValue]) =>
    isOverviewShardEntry(fieldName, fieldValue),
  );
};

const appendOwnedRooms = (ownedRooms, shardName, shardOverview) => {
  for (const roomName of shardOverview.rooms) {
    if (typeof roomName === 'string' && roomName.trim() !== '') {
      ownedRooms.push({
        roomName: roomName.trim(),
        shardName,
      });
    }
  }
};

const isOverviewShardEntry = (fieldName, fieldValue) =>
  /^shard\d+$/u.test(fieldName) && isPlainObject(fieldValue) && Array.isArray(fieldValue.rooms);

const readShardNames = (shardInfo) => {
  if (!Array.isArray(shardInfo.shards)) {
    return [];
  }

  return shardInfo.shards
    .map((shardRecord) =>
      isPlainObject(shardRecord) && typeof shardRecord.name === 'string'
        ? shardRecord.name.trim()
        : '',
    )
    .filter((shardName) => shardName !== '')
    .sort();
};

const assertTargetSpawnExists = (roomObjects) => {
  const targetSpawn = roomObjects.find(
    (roomObject) =>
      isPlainObject(roomObject) &&
      roomObject.type === 'spawn' &&
      roomObject.name === PTR_MAIN_ROOM_TARGET.spawnName &&
      roomObject.x === PTR_MAIN_ROOM_TARGET.x &&
      roomObject.y === PTR_MAIN_ROOM_TARGET.y,
  );

  if (targetSpawn === undefined) {
    throw new Error(
      `PTR room ${formatRoom(PTR_MAIN_ROOM_TARGET)} does not contain ${
        PTR_MAIN_ROOM_TARGET.spawnName
      } at ${PTR_MAIN_ROOM_TARGET.x},${PTR_MAIN_ROOM_TARGET.y}.`,
    );
  }
};

const roomStatusAllowsSpawn = (roomStatus) => roomStatus === 'normal' || roomStatus === 'respawn';

const formatRoom = (roomIdentity) => `${roomIdentity.shardName}/${roomIdentity.roomName}`;

const formatList = (values) => (values.length === 0 ? '[]' : values.join(','));

const isPlainObject = (candidateValue) =>
  typeof candidateValue === 'object' && candidateValue !== null && !Array.isArray(candidateValue);

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await foundPtrMainRoom();
  } catch (caughtError) {
    reportCommandFailure('found:ptr-room:screeps', caughtError);
  }
}
