import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadRoleRecoveryStatusModule } from '../../support/screeps-deployment-modules';

interface FetchRecord {
  readonly init: RequestInit | undefined;
  readonly url: string;
}

interface RoleRecoveryFetchPayloads {
  readonly authMe: Record<string, unknown>;
  readonly remoteModules: Record<string, unknown>;
  readonly roomObjects: Record<string, unknown>;
  readonly roomStatus: Record<string, unknown>;
  readonly userMemory: Record<string, unknown>;
}

interface ConsoleLogSpy {
  readonly mock: {
    readonly calls: readonly unknown[][];
  };
}

const SCREEPS_CONFIG_TEXT = JSON.stringify({
  main: {
    branch: 'main',
    protocol: 'https',
    server: 'screeps.com',
    token: 'secret-token',
  },
});

describe('role recovery live status command', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('parses explicit shard and room arguments at the command boundary', async () => {
    const roleRecoveryModule = await loadRoleRecoveryStatusModule();

    expect(
      roleRecoveryModule.parseRoleRecoveryStatusRequest([
        '--',
        '--shard',
        'shard1',
        '--room',
        'W51N21',
      ]),
    ).toEqual({
      roomName: 'W51N21',
      shardName: 'shard1',
    });
    expect(() => roleRecoveryModule.parseRoleRecoveryStatusRequest(['--room', 'W51N21'])).toThrow(
      'Missing --shard <name>.',
    );
    expect(() => roleRecoveryModule.parseRoleRecoveryStatusRequest(['--shard'])).toThrow(
      'Missing value after --shard.',
    );
    expect(() => roleRecoveryModule.parseRoleRecoveryStatusRequest(['--invalid'])).toThrow(
      'Unknown argument "--invalid".',
    );
  });

  it('prints role counts, road backlog, source energy, construction progress, and spawning role', async () => {
    const workspacePath = await createRoleRecoveryStatusWorkspace();
    const memoryPayload = {
      'Spawn1-builder-71836184': { role: 'builder' },
      'Spawn1-builder-71836202': { role: 'builder' },
      'Spawn1-hauler-71835327': { role: 'hauler' },
      'Spawn1-hauler-71836137': { role: 'hauler' },
      'Spawn1-miner-71835092': { role: 'miner' },
      'Spawn1-miner-71835128': { role: 'miner' },
      'Spawn1-upgrader-71836250': { role: 'upgrader' },
    };
    const fetchRecords = stubRoleRecoveryFetch({
      authMe: {
        _id: 'alice-user',
        ok: 1,
        username: 'Alice',
      },
      remoteModules: {
        modules: {
          main: 'remote-main-source',
        },
        ok: 1,
      },
      roomObjects: {
        objects: [
          { type: 'source', x: 30, y: 6 },
          { type: 'source', x: 20, y: 42 },
          {
            name: 'Spawn1',
            spawning: { name: 'Spawn1-upgrader-71836250' },
            store: { energy: 147 },
            storeCapacityResource: { energy: 300 },
            type: 'spawn',
            user: 'alice-user',
            x: 35,
            y: 23,
          },
          {
            name: 'Spawn1-miner-71835092',
            store: { energy: 22 },
            type: 'creep',
            user: 'alice-user',
          },
          {
            name: 'Spawn1-miner-71835128',
            store: { energy: 50 },
            type: 'creep',
            user: 'alice-user',
          },
          {
            name: 'Spawn1-hauler-71835327',
            store: { energy: 100 },
            type: 'creep',
            user: 'alice-user',
          },
          {
            name: 'Spawn1-hauler-71836137',
            store: { energy: 150 },
            type: 'creep',
            user: 'alice-user',
          },
          {
            name: 'Spawn1-builder-71836184',
            store: { energy: 49 },
            type: 'creep',
            user: 'alice-user',
          },
          {
            name: 'Spawn1-builder-71836202',
            store: { energy: 0 },
            type: 'creep',
            user: 'alice-user',
          },
          {
            name: 'Spawn1-upgrader-71836250',
            store: { energy: 0 },
            type: 'creep',
            user: 'alice-user',
          },
          {
            hits: 200,
            hitsMax: 5000,
            type: 'road',
            x: 32,
            y: 26,
          },
          {
            hits: 1200,
            hitsMax: 5000,
            type: 'road',
            x: 31,
            y: 25,
          },
          {
            hits: 4000,
            hitsMax: 5000,
            type: 'road',
            x: 35,
            y: 23,
          },
          {
            progress: 8880,
            progressTotal: 30000,
            structureType: 'storage',
            type: 'constructionSite',
            user: 'alice-user',
          },
          {
            store: { energy: 2000 },
            storeCapacityResource: { energy: 2000 },
            type: 'container',
            user: 'alice-user',
            x: 29,
            y: 6,
          },
          {
            store: { energy: 1800 },
            storeCapacityResource: { energy: 2000 },
            type: 'container',
            user: 'alice-user',
            x: 20,
            y: 43,
          },
          {
            store: { energy: 0 },
            storeCapacityResource: { energy: 2000 },
            type: 'container',
            user: 'alice-user',
            x: 27,
            y: 8,
          },
        ],
        ok: 1,
      },
      roomStatus: {
        ok: 1,
        room: { status: 'normal' },
      },
      userMemory: {
        data: `gz:${gzipSync(JSON.stringify(memoryPayload)).toString('base64')}`,
        ok: 1,
      },
    });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    try {
      const roleRecoveryModule = await loadRoleRecoveryStatusModule();

      await roleRecoveryModule.checkRoleRecoveryStatusFrom(workspacePath, [
        '--shard',
        'shard1',
        '--room',
        'W51N21',
      ]);

      expect(fetchRecords.map((fetchRecord) => fetchRecord.url)).toEqual([
        'https://screeps.com/api/auth/me',
        'https://screeps.com/api/game/room-status?room=W51N21&shard=shard1',
        'https://screeps.com/api/game/room-objects?room=W51N21&shard=shard1',
        'https://screeps.com/api/user/memory?path=creeps&shard=shard1',
        'https://screeps.com/api/user/code?branch=main',
      ]);
      expect(fetchRecords.map((fetchRecord) => fetchRecord.init?.headers)).toEqual([
        { 'X-Token': 'secret-token' },
        { 'X-Token': 'secret-token' },
        { 'X-Token': 'secret-token' },
        { 'X-Token': 'secret-token' },
        { 'X-Token': 'secret-token' },
      ]);
      expect(joinedLogLines(logSpy)).toContain(
        '[status:role-recovery:screeps] branch=main shard=shard1 room=W51N21 status=normal',
      );
      expect(joinedLogLines(logSpy)).toContain(
        'creeps=7 roleCounts=builder:2,hauler:2,miner:2,upgrader:1',
      );
      expect(joinedLogLines(logSpy)).toContain('spawningRole=upgrader');
      expect(joinedLogLines(logSpy)).toContain(
        'constructionSites=1 constructionProgress=8880/30000',
      );
      expect(joinedLogLines(logSpy)).toContain(
        'roadCritical=1/3 roadDamaged=2/3 roadMinHits=200/5000',
      );
      expect(joinedLogLines(logSpy)).toContain('sourceContainers=20,43:1800/2000|29,6:2000/2000');
      expect(joinedLogLines(logSpy)).not.toContain('secret-token');
      expect(joinedLogLines(logSpy)).not.toContain('remote-main-source');
    } finally {
      await rm(workspacePath, { force: true, recursive: true });
    }
  });
});

const createRoleRecoveryStatusWorkspace = async () => {
  const workspacePath = await mkdtemp(join(tmpdir(), 'screeps-role-recovery-status-'));

  await mkdir(join(workspacePath, 'dist'), { recursive: true });
  await writeFile(join(workspacePath, 'screeps.json'), SCREEPS_CONFIG_TEXT);

  return workspacePath;
};

const stubRoleRecoveryFetch = (apiPayloadsByRoute: RoleRecoveryFetchPayloads) => {
  const fetchRecords: FetchRecord[] = [];

  vi.stubGlobal('fetch', (requestInput: string | URL, requestInit?: RequestInit) => {
    const requestUrl = new URL(requestInput.toString());
    fetchRecords.push({
      init: requestInit,
      url: requestInput.toString(),
    });

    const apiPayload = selectRoleRecoveryApiPayload(apiPayloadsByRoute, requestUrl.pathname);

    return Promise.resolve(
      new Response(JSON.stringify(apiPayload), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }),
    );
  });

  return fetchRecords;
};

const selectRoleRecoveryApiPayload = (
  apiPayloadsByRoute: RoleRecoveryFetchPayloads,
  apiPath: string,
) => {
  if (apiPath === '/api/auth/me') {
    return apiPayloadsByRoute.authMe;
  }

  if (apiPath === '/api/game/room-status') {
    return apiPayloadsByRoute.roomStatus;
  }

  if (apiPath === '/api/game/room-objects') {
    return apiPayloadsByRoute.roomObjects;
  }

  if (apiPath === '/api/user/memory') {
    return apiPayloadsByRoute.userMemory;
  }

  if (apiPath === '/api/user/code') {
    return apiPayloadsByRoute.remoteModules;
  }

  throw new Error(`Unexpected live API path ${apiPath}.`);
};

const joinedLogLines = (logSpy: ConsoleLogSpy) =>
  logSpy.mock.calls.map((logCall) => logCall.map(String).join(' ')).join('\n');
