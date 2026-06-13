import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadLiveSurvivalStatusModule } from '../../support/screeps-deployment-modules';

interface FetchRecord {
  readonly init: RequestInit | undefined;
  readonly url: string;
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

describe('live survival status command', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('prints a read-only room survival summary without credential or module source material', async () => {
    const workspacePath = await createLiveStatusWorkspace();
    const fetchRecords = stubLiveFetch([
      {
        ok: 1,
        room: { status: 'normal' },
      },
      {
        objects: [
          {
            downgradeTime: 71634002,
            level: 2,
            progress: 9412,
            type: 'controller',
          },
          {
            name: 'Spawn1',
            spawning: null,
            store: { energy: 250 },
            storeCapacityResource: { energy: 300 },
            type: 'spawn',
            user: 'alice-user',
          },
          {
            name: 'Spawn1-worker-1',
            store: { energy: 50 },
            type: 'creep',
            user: 'alice-user',
          },
          {
            name: 'Spawn1-worker-2',
            store: { energy: 0 },
            type: 'creep',
            user: 'alice-user',
          },
          {
            name: 'Invader',
            type: 'creep',
            user: 'invader-user',
          },
          {
            progress: 50,
            progressTotal: 3000,
            structureType: 'extension',
            type: 'constructionSite',
            user: 'alice-user',
          },
          {
            type: 'tower',
            user: 'invader-user',
          },
        ],
        ok: 1,
      },
      {
        modules: {
          main: 'remote-main-source',
        },
        ok: 1,
      },
    ]);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    try {
      const liveStatusModule = await loadLiveSurvivalStatusModule();

      await liveStatusModule.checkLiveSurvivalStatusFrom(workspacePath, [
        '--shard',
        'shard1',
        '--room',
        'W51N21',
      ]);

      expect(fetchRecords.map((fetchRecord) => fetchRecord.url)).toEqual([
        'https://screeps.com/api/game/room-status?room=W51N21&shard=shard1',
        'https://screeps.com/api/game/room-objects?room=W51N21&shard=shard1',
        'https://screeps.com/api/user/code?branch=main',
      ]);
      expect(fetchRecords.map((fetchRecord) => fetchRecord.init?.headers)).toEqual([
        { 'X-Token': 'secret-token' },
        { 'X-Token': 'secret-token' },
        { 'X-Token': 'secret-token' },
      ]);
      expect(joinedLogLines(logSpy)).toContain(
        '[status:live:screeps] branch=main shard=shard1 room=W51N21 status=normal',
      );
      expect(joinedLogLines(logSpy)).toContain('controllerLevel=2');
      expect(joinedLogLines(logSpy)).toContain('controllerDowngradeTime=71634002');
      expect(joinedLogLines(logSpy)).toContain('workerCount=2');
      expect(joinedLogLines(logSpy)).toContain('spawnEnergy=250/300');
      expect(joinedLogLines(logSpy)).toContain('constructionSites=1 constructionProgress=50/3000');
      expect(joinedLogLines(logSpy)).toContain('hostileCreeps=1 hostileSpawns=0 hostileTowers=1');
      expect(joinedLogLines(logSpy)).toContain('constants=official-runtime-capture');
      expect(joinedLogLines(logSpy)).not.toContain('secret-token');
      expect(joinedLogLines(logSpy)).not.toContain('remote-main-source');
    } finally {
      await rm(workspacePath, { force: true, recursive: true });
    }
  });
});

const createLiveStatusWorkspace = async () => {
  const workspacePath = await mkdtemp(join(tmpdir(), 'screeps-live-status-'));

  await mkdir(join(workspacePath, 'dist'), { recursive: true });
  await writeFile(join(workspacePath, 'screeps.json'), SCREEPS_CONFIG_TEXT);

  return workspacePath;
};

const stubLiveFetch = (apiPayloads: readonly Record<string, unknown>[]) => {
  const fetchRecords: FetchRecord[] = [];
  let nextPayloadIndex = 0;

  vi.stubGlobal('fetch', (requestInput: string | URL, requestInit?: RequestInit) => {
    fetchRecords.push({
      init: requestInit,
      url: requestInput.toString(),
    });

    const apiPayload = apiPayloads[nextPayloadIndex];
    nextPayloadIndex += 1;

    return Promise.resolve(
      new Response(JSON.stringify(apiPayload), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }),
    );
  });

  return fetchRecords;
};

const joinedLogLines = (logSpy: ConsoleLogSpy) =>
  logSpy.mock.calls.map((logCall) => logCall.map(String).join(' ')).join('\n');
