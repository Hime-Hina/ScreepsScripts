import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { afterEach, describe, expect, it, vi } from 'vitest';

interface ScoutRoomsModule {
  scoutScreepsRooms(commandArguments?: readonly string[]): Promise<void>;
}

const REPOSITORY_PATH = process.cwd();

const loadScoutRoomsModule = async (): Promise<ScoutRoomsModule> => {
  const loadedModule = (await import(
    pathToFileURL(resolve(REPOSITORY_PATH, 'scripts/screeps/scout-rooms.mjs')).href
  )) as unknown;

  if (!isScoutRoomsModule(loadedModule)) {
    throw new Error('scout-rooms.mjs exports changed.');
  }

  return loadedModule;
};

const isScoutRoomsModule = (candidateModule: unknown): candidateModule is ScoutRoomsModule =>
  typeof candidateModule === 'object' &&
  candidateModule !== null &&
  'scoutScreepsRooms' in candidateModule &&
  typeof candidateModule.scoutScreepsRooms === 'function';

describe('Screeps room scout command', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('counts adjacent candidate rooms as neighbor risk inside the same area scan', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'screeps-scout-'));
    const originalWorkspacePath = process.cwd();

    try {
      await writeFile(
        join(workspacePath, 'screeps.json'),
        JSON.stringify({
          main: {
            branch: 'main',
            protocol: 'http',
            server: '127.0.0.1:21025',
            token: 'secret-token',
          },
        }),
      );

      vi.stubGlobal('fetch', (requestInput: string | URL) =>
        Promise.resolve(createRoomResponse(new URL(requestInput.toString()))),
      );

      const loggedReports: string[] = [];
      vi.spyOn(console, 'log').mockImplementation((message: unknown) => {
        loggedReports.push(String(message));
      });

      process.chdir(workspacePath);

      const scoutRoomsModule = await loadScoutRoomsModule();

      await scoutRoomsModule.scoutScreepsRooms(['--shard', 'shard3', '--area', 'W1S1:W1S2']);

      const scoutReportText = loggedReports.join('\n');
      const w1s1ReportLine = scoutReportText
        .split('\n')
        .find((reportLine) => reportLine.includes(' W1S1 '));

      expect(w1s1ReportLine).toContain('neighborSpawns=1');
      expect(w1s1ReportLine).toContain('neighborTowers=1');
      expect(w1s1ReportLine).toContain('neighborCreeps=1');
      expect(w1s1ReportLine).toContain('1 neighboring spawns');
    } finally {
      process.chdir(originalWorkspacePath);
      await rm(workspacePath, { recursive: true });
    }
  });
});

const createRoomResponse = (requestUrl: URL) => {
  const roomName = requestUrl.searchParams.get('room');

  if (roomName === null) {
    return jsonResponse({ ok: 0 });
  }

  if (requestUrl.pathname === '/api/game/room-status') {
    return jsonResponse({ ok: 1, room: { status: 'normal' } });
  }

  if (requestUrl.pathname === '/api/game/room-terrain') {
    return jsonResponse({
      ok: 1,
      terrain: [
        {
          room: roomName,
          terrain: '0'.repeat(2500),
        },
      ],
    });
  }

  if (requestUrl.pathname === '/api/game/room-objects') {
    return jsonResponse({
      objects: createRoomObjects(roomName),
      ok: 1,
    });
  }

  return jsonResponse({ ok: 0 });
};

const createRoomObjects = (roomName: string) => {
  if (roomName === 'W1S1') {
    return [
      { type: 'source', x: 10, y: 10 },
      { type: 'source', x: 20, y: 10 },
      { type: 'controller', x: 25, y: 25 },
      { mineralType: 'K', type: 'mineral', x: 30, y: 30 },
    ];
  }

  if (roomName === 'W1S2') {
    return [
      { type: 'source', x: 10, y: 10 },
      { type: 'source', x: 20, y: 10 },
      { type: 'controller', x: 25, y: 25 },
      { mineralType: 'O', type: 'mineral', x: 30, y: 30 },
      { type: 'spawn', x: 31, y: 31 },
      { type: 'tower', x: 32, y: 31 },
      { type: 'creep', x: 33, y: 31 },
    ];
  }

  return [];
};

const jsonResponse = (responsePayload: unknown) =>
  new Response(JSON.stringify(responsePayload), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  });
