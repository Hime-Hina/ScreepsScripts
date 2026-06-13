import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  loadPtrDeployModule,
  loadPtrRoomFoundingModule,
  loadPtrRollbackModule,
  loadPtrRollbackSnapshotModule,
  loadPtrVerifyModule,
} from '../../support/screeps-deployment-modules';

interface FetchRecord {
  readonly url: string;
  readonly init: RequestInit | undefined;
}

interface ConsoleLogSpy {
  readonly mock: {
    readonly calls: readonly unknown[][];
  };
}

const PTR_CONFIG_TEXT = JSON.stringify({
  branch: 'main',
  token: 'ptr-secret-token',
});

describe('Screeps PTR commands', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('verifies PTR API readback separately from natural tick evidence', async () => {
    const workspacePath = await createPtrWorkspace('local-main');
    const fetchRecords = stubPtrFetch([
      {
        ok: 1,
        modules: {
          main: 'local-main',
        },
      },
    ]);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    try {
      const ptrVerifyModule = await loadPtrVerifyModule();

      await ptrVerifyModule.verifyPtrScreepsReadbackFrom(workspacePath);

      expect(fetchRecords).toHaveLength(1);
      expect(fetchRecords[0]?.url).toBe('https://screeps.com/ptr/api/user/code?branch=main');
      expect(fetchRecords[0]?.init?.headers).toEqual({
        'X-Token': 'ptr-secret-token',
      });
      expect(joinedLogLines(logSpy)).toContain('[verify:ptr:screeps] apiReadback=main-matched');
      expect(joinedLogLines(logSpy)).toContain(
        '[verify:ptr:screeps] naturalTickHeartbeat=not-verified-by-this-script',
      );
      expect(joinedLogLines(logSpy)).not.toContain('ptr-secret-token');
      expect(joinedLogLines(logSpy)).not.toContain('local-main');
    } finally {
      await rm(workspacePath, { force: true, recursive: true });
    }
  });

  it('fails PTR verification when remote main differs from dist main', async () => {
    const workspacePath = await createPtrWorkspace('local-main');
    stubPtrFetch([
      {
        ok: 1,
        modules: {
          main: 'different-main',
        },
      },
    ]);

    try {
      const ptrVerifyModule = await loadPtrVerifyModule();

      await expect(ptrVerifyModule.verifyPtrScreepsReadbackFrom(workspacePath)).rejects.toThrow(
        'PTR API readback main module does not match dist/main.js.',
      );
    } finally {
      await rm(workspacePath, { force: true, recursive: true });
    }
  });

  it('snapshots current PTR modules before uploading local main and verifying readback', async () => {
    const workspacePath = await createPtrWorkspace('local-main');
    const fetchRecords = stubPtrFetch([
      {
        ok: 1,
        modules: {
          main: 'old-main',
          'main.js.map': 'old-map',
        },
      },
      {
        ok: 1,
      },
      {
        ok: 1,
        modules: {
          main: 'local-main',
        },
      },
    ]);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    try {
      const ptrDeployModule = await loadPtrDeployModule();

      await ptrDeployModule.deployPtrScreepsFrom(workspacePath);

      expect(fetchRecords.map((fetchRecord) => fetchRecord.url)).toEqual([
        'https://screeps.com/ptr/api/user/code?branch=main',
        'https://screeps.com/ptr/api/user/code',
        'https://screeps.com/ptr/api/user/code?branch=main',
      ]);
      expect(fetchRecords[1]?.init?.body).toBe(
        JSON.stringify({ branch: 'main', modules: { main: 'local-main' } }),
      );

      const snapshotText = await readFile(join(workspacePath, '.screeps', 'ptr', 'latest.json'), {
        encoding: 'utf8',
      });
      const snapshot: unknown = JSON.parse(snapshotText);

      expect(snapshot).toMatchObject({
        branch: 'main',
        modules: {
          main: 'old-main',
          'main.js.map': 'old-map',
        },
      });
      expect(joinedLogLines(logSpy)).toContain(
        `[deploy:ptr:screeps] rollbackSnapshot=${join('.screeps', 'ptr', 'latest.json')}`,
      );
      expect(joinedLogLines(logSpy)).toContain(
        '[deploy:ptr:screeps] naturalTickHeartbeat=not-verified-by-this-script',
      );
      expect(joinedLogLines(logSpy)).not.toContain('ptr-secret-token');
      expect(joinedLogLines(logSpy)).not.toContain('local-main');
      expect(joinedLogLines(logSpy)).not.toContain('old-main');
    } finally {
      await rm(workspacePath, { force: true, recursive: true });
    }
  });

  it('stops PTR rollback when the snapshot is missing', async () => {
    const workspacePath = await createPtrWorkspace('local-main');

    try {
      const ptrRollbackModule = await loadPtrRollbackModule();

      await expect(ptrRollbackModule.rollbackPtrScreepsFrom(workspacePath)).rejects.toThrow(
        'Missing PTR rollback snapshot at',
      );
    } finally {
      await rm(workspacePath, { force: true, recursive: true });
    }
  });

  it('stops PTR rollback when the snapshot branch differs from config branch', async () => {
    const workspacePath = await createPtrWorkspace('local-main');
    const ptrRollbackSnapshotModule = await loadPtrRollbackSnapshotModule();

    try {
      await ptrRollbackSnapshotModule.writePtrRollbackSnapshotTo(
        workspacePath,
        ptrRollbackSnapshotModule.createPtrRollbackSnapshot(
          'simulation',
          {
            main: 'old-main',
          },
          '2026-06-10T00:00:00.000Z',
        ),
      );

      const ptrRollbackModule = await loadPtrRollbackModule();

      await expect(ptrRollbackModule.rollbackPtrScreepsFrom(workspacePath)).rejects.toThrow(
        'PTR rollback snapshot branch "simulation" does not match configured branch "main".',
      );
    } finally {
      await rm(workspacePath, { force: true, recursive: true });
    }
  });

  it('fails PTR rollback when restored readback differs from the snapshot', async () => {
    const workspacePath = await createPtrWorkspace('local-main');
    const ptrRollbackSnapshotModule = await loadPtrRollbackSnapshotModule();
    stubPtrFetch([
      {
        ok: 1,
      },
      {
        ok: 1,
        modules: {
          main: 'different-main',
        },
      },
    ]);

    try {
      await ptrRollbackSnapshotModule.writePtrRollbackSnapshotTo(
        workspacePath,
        ptrRollbackSnapshotModule.createPtrRollbackSnapshot(
          'main',
          {
            main: 'old-main',
          },
          '2026-06-10T00:00:00.000Z',
        ),
      );

      const ptrRollbackModule = await loadPtrRollbackModule();

      await expect(ptrRollbackModule.rollbackPtrScreepsFrom(workspacePath)).rejects.toThrow(
        'Readback mismatch after PTR rollback; remote code does not match PTR rollback snapshot.',
      );
    } finally {
      await rm(workspacePath, { force: true, recursive: true });
    }
  });

  it('restores the PTR snapshot and verifies the restored module set by readback', async () => {
    const workspacePath = await createPtrWorkspace('local-main');
    const ptrRollbackSnapshotModule = await loadPtrRollbackSnapshotModule();
    const fetchRecords = stubPtrFetch([
      {
        ok: 1,
      },
      {
        ok: 1,
        modules: {
          main: 'old-main',
          'main.js.map': 'old-map',
        },
      },
    ]);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    try {
      await ptrRollbackSnapshotModule.writePtrRollbackSnapshotTo(
        workspacePath,
        ptrRollbackSnapshotModule.createPtrRollbackSnapshot(
          'main',
          {
            main: 'old-main',
            'main.js.map': 'old-map',
          },
          '2026-06-10T00:00:00.000Z',
        ),
      );

      const ptrRollbackModule = await loadPtrRollbackModule();

      await ptrRollbackModule.rollbackPtrScreepsFrom(workspacePath);

      expect(fetchRecords.map((fetchRecord) => fetchRecord.url)).toEqual([
        'https://screeps.com/ptr/api/user/code',
        'https://screeps.com/ptr/api/user/code?branch=main',
      ]);
      expect(fetchRecords[0]?.init?.body).toBe(
        JSON.stringify({
          branch: 'main',
          modules: {
            main: 'old-main',
            'main.js.map': 'old-map',
          },
        }),
      );
      expect(joinedLogLines(logSpy)).toContain('[rollback:ptr:screeps] branch=main');
      expect(joinedLogLines(logSpy)).toContain(
        '[rollback:ptr:screeps] restoredSnapshotCapturedAt=2026-06-10T00:00:00.000Z',
      );
      expect(joinedLogLines(logSpy)).not.toContain('ptr-secret-token');
      expect(joinedLogLines(logSpy)).not.toContain('old-main');
    } finally {
      await rm(workspacePath, { force: true, recursive: true });
    }
  });

  it('founds the documented main room on PTR when no PTR room exists', async () => {
    const workspacePath = await createPtrWorkspace('local-main');
    const fetchRecords = stubPtrFetch([
      {
        cpu: 80,
        cpuShard: { shard1: 20 },
        ok: 1,
        username: 'Dragon_King',
      },
      {
        ok: 1,
        shards: {
          shard1: {
            gametime: 71630000,
            rooms: [],
          },
        },
      },
      {
        ok: 1,
        shards: [{ cpuLimit: 20, name: 'shard1' }],
      },
      {
        ok: 1,
        room: { status: 'normal' },
      },
      {
        newbie: true,
        ok: 1,
      },
      {
        objects: [
          {
            name: 'Spawn1',
            type: 'spawn',
            x: 35,
            y: 23,
          },
        ],
        ok: 1,
      },
    ]);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    try {
      const ptrRoomFoundingModule = await loadPtrRoomFoundingModule();

      await ptrRoomFoundingModule.foundPtrMainRoomFrom(workspacePath);

      expect(fetchRecords.map((fetchRecord) => fetchRecord.url)).toEqual([
        'https://screeps.com/ptr/api/auth/me',
        'https://screeps.com/ptr/api/user/overview?interval=8',
        'https://screeps.com/ptr/api/game/shards/info',
        'https://screeps.com/ptr/api/game/room-status?room=W51N21&shard=shard1',
        'https://screeps.com/ptr/api/game/place-spawn',
        'https://screeps.com/ptr/api/game/room-objects?room=W51N21&shard=shard1',
      ]);
      expect(fetchRecords[4]?.init?.body).toBe(
        JSON.stringify({ room: 'W51N21', shard: 'shard1', x: 35, y: 23, name: 'Spawn1' }),
      );
      expect(joinedLogLines(logSpy)).toContain(
        '[found:ptr-room:screeps] status=spawn-placed room=shard1/W51N21 spawn=Spawn1 x=35 y=23 newbie=true',
      );
      expect(joinedLogLines(logSpy)).not.toContain('ptr-secret-token');
    } finally {
      await rm(workspacePath, { force: true, recursive: true });
    }
  });

  it('verifies the documented PTR main room without placing another spawn', async () => {
    const workspacePath = await createPtrWorkspace('local-main');
    const fetchRecords = stubPtrFetch([
      {
        cpu: 80,
        cpuShard: { shard1: 20 },
        ok: 1,
        username: 'Dragon_King',
      },
      {
        ok: 1,
        shards: {
          shard1: {
            gametime: 71630000,
            rooms: ['W51N21'],
          },
        },
      },
      {
        ok: 1,
        shards: [{ cpuLimit: 20, name: 'shard1' }],
      },
      {
        objects: [
          {
            name: 'Spawn1',
            type: 'spawn',
            x: 35,
            y: 23,
          },
        ],
        ok: 1,
      },
    ]);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    try {
      const ptrRoomFoundingModule = await loadPtrRoomFoundingModule();

      await ptrRoomFoundingModule.foundPtrMainRoomFrom(workspacePath);

      expect(fetchRecords.map((fetchRecord) => fetchRecord.url)).toEqual([
        'https://screeps.com/ptr/api/auth/me',
        'https://screeps.com/ptr/api/user/overview?interval=8',
        'https://screeps.com/ptr/api/game/shards/info',
        'https://screeps.com/ptr/api/game/room-objects?room=W51N21&shard=shard1',
      ]);
      expect(joinedLogLines(logSpy)).toContain(
        '[found:ptr-room:screeps] status=already-founded room=shard1/W51N21 spawn=Spawn1 x=35 y=23',
      );
    } finally {
      await rm(workspacePath, { force: true, recursive: true });
    }
  });

  it('stops PTR founding when another PTR owned room exists', async () => {
    const workspacePath = await createPtrWorkspace('local-main');
    stubPtrFetch([
      {
        cpu: 80,
        ok: 1,
        username: 'Dragon_King',
      },
      {
        ok: 1,
        shards: {
          shard3: {
            gametime: 71630000,
            rooms: ['W1N1'],
          },
        },
      },
      {
        ok: 1,
        shards: [{ cpuLimit: 20, name: 'shard3' }],
      },
    ]);

    try {
      const ptrRoomFoundingModule = await loadPtrRoomFoundingModule();

      await expect(ptrRoomFoundingModule.foundPtrMainRoomFrom(workspacePath)).rejects.toThrow(
        'PTR already has owned room shard3/W1N1; refusing to found shard1/W51N21.',
      );
    } finally {
      await rm(workspacePath, { force: true, recursive: true });
    }
  });
});

const createPtrWorkspace = async (mainModuleSource: string) => {
  const workspacePath = await mkdtemp(join(tmpdir(), 'screeps-ptr-command-'));

  await writeFile(join(workspacePath, 'screeps.ptr.json'), PTR_CONFIG_TEXT);
  await mkdir(join(workspacePath, 'dist'), { recursive: true });
  await writeFile(join(workspacePath, 'dist', 'main.js'), mainModuleSource);

  return workspacePath;
};

const stubPtrFetch = (apiPayloads: readonly Record<string, unknown>[]) => {
  const fetchRecords: FetchRecord[] = [];
  let nextPayloadIndex = 0;

  vi.stubGlobal('fetch', (requestInput: string | URL, requestInit?: RequestInit) => {
    fetchRecords.push({
      url: requestInput.toString(),
      init: requestInit,
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
