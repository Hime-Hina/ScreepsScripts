import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadLiveSurvivalStatusModule } from '../../support/screeps-deployment-modules';

interface FetchRecord {
  readonly init: RequestInit | undefined;
  readonly url: string;
}

interface LiveFetchPayloads {
  readonly authMe: Record<string, unknown>;
  readonly overview: Record<string, unknown>;
  readonly remoteModules: Record<string, unknown>;
  readonly roomObjects: Record<string, unknown>;
  readonly roomStatus: Record<string, unknown>;
}

interface ConsoleLogSpy {
  readonly mock: {
    readonly calls: readonly unknown[][];
  };
}

interface ConsoleWebSocketScenario {
  readonly accountId: string;
  readonly heartbeatLine: string;
  readonly shardName: string;
}

const SCREEPS_CONFIG_TEXT = JSON.stringify({
  main: {
    branch: 'main',
    protocol: 'https',
    server: 'screeps.com',
    token: 'secret-token',
  },
});

const P4_HEARTBEAT_LINE =
  '[HERMES_EVENT] {"schema":"screeps.ops.event.v1","id":"runtime_heartbeat:shard1:71650000","dedupeKey":"runtime_heartbeat:shard1","severity":"info","kind":"runtime_heartbeat","tick":71650000,"shard":"shard1","summary":"runtime heartbeat for 1 room(s)","metrics":{"cpu":0.63,"bucket":9876,"limit":20,"tickLimit":500,"budget":"full","rooms":[{"room":"W51N21","workerCount":5,"spawnEnergy":"300/300","constructionSiteCount":5,"hostileCount":0}]}}';

describe('live survival status command', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    MockConsoleWebSocket.authFailureAccountId = null;
    MockConsoleWebSocket.closeAfterConsoleUpdate = false;
    MockConsoleWebSocket.instances = [];
  });

  it('parses explicit shard and room arguments at the command boundary', async () => {
    const liveStatusModule = await loadLiveSurvivalStatusModule();

    expect(
      liveStatusModule.parseLiveSurvivalStatusRequest([
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
    expect(() => liveStatusModule.parseLiveSurvivalStatusRequest(['--room', 'W51N21'])).toThrow(
      'Missing --shard <name>.',
    );
    expect(() => liveStatusModule.parseLiveSurvivalStatusRequest(['--shard'])).toThrow(
      'Missing value after --shard.',
    );
    expect(() => liveStatusModule.parseLiveSurvivalStatusRequest(['--invalid'])).toThrow(
      'Unknown argument "--invalid".',
    );
  });

  it('prints read-only room survival summary with natural console heartbeat evidence', async () => {
    const workspacePath = await createLiveStatusWorkspace();
    const fetchRecords = stubLiveFetch({
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
      overview: {
        ok: 1,
        shard1: {
          rooms: ['W51N21'],
        },
      },
      roomObjects: {
        objects: [
          {
            downgradeTime: 71634002,
            level: 2,
            progress: 9412,
            type: 'controller',
            user: 'alice-user',
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
      roomStatus: {
        ok: 1,
        room: { status: 'normal' },
      },
    });
    stubConsoleWebSocket({
      accountId: 'alice-user',
      heartbeatLine: P4_HEARTBEAT_LINE,
      shardName: 'shard1',
    });
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
        'https://screeps.com/api/auth/me',
        'https://screeps.com/api/user/overview?interval=8',
        'https://screeps.com/api/game/room-status?room=W51N21&shard=shard1',
        'https://screeps.com/api/game/room-objects?room=W51N21&shard=shard1',
        'https://screeps.com/api/user/code?branch=main',
      ]);
      expect(fetchRecords.map((fetchRecord) => fetchRecord.init?.headers)).toEqual([
        { 'X-Token': 'secret-token' },
        { 'X-Token': 'secret-token' },
        { 'X-Token': 'secret-token' },
        { 'X-Token': 'secret-token' },
        { 'X-Token': 'secret-token' },
      ]);
      expect(MockConsoleWebSocket.instances).toHaveLength(1);
      expect(MockConsoleWebSocket.instances[0]?.url).toMatch(
        /^wss:\/\/screeps\.com\/socket\/\d+\/[a-z0-5]{8}\/websocket$/,
      );
      expect(MockConsoleWebSocket.instances[0]?.url).not.toContain('secret-token');
      expect(MockConsoleWebSocket.instances[0]?.sentMessages).toEqual([
        '["auth secret-token"]',
        '["subscribe user:alice-user/console"]',
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
      expect(joinedLogLines(logSpy)).toContain(
        'recoveryStates=W51N21:creepPopulationMissing recoveryBlockers=-',
      );
      expect(joinedLogLines(logSpy)).toContain(
        'naturalTickHeartbeat=verified tick=71650000 heartbeatShard=shard1 heartbeatRoom=W51N21 heartbeatCpu=0.63 heartbeatBucket=9876 heartbeatLimit=20 heartbeatTickLimit=500 heartbeatBudget=full heartbeatWorkers=5 heartbeatSpawnEnergy=300/300 heartbeatConstruction=5 heartbeatHostiles=0',
      );
      expect(joinedLogLines(logSpy)).toContain('constants=official-runtime-capture');
      expect(joinedLogLines(logSpy)).not.toContain('secret-token');
      expect(joinedLogLines(logSpy)).not.toContain('refreshed-token');
      expect(joinedLogLines(logSpy)).not.toContain('remote-main-source');
    } finally {
      await rm(workspacePath, { force: true, recursive: true });
    }
  });

  it('prints single-room spawn-missing rebuild blocker without creating rebuild action evidence', async () => {
    const workspacePath = await createLiveStatusWorkspace();
    stubLiveFetch({
      authMe: {
        _id: 'alice-user',
        ok: 1,
        username: 'Alice',
      },
      overview: {
        ok: 1,
        shard1: {
          rooms: ['W51N21'],
        },
      },
      remoteModules: {
        modules: {
          main: 'remote-main-source',
        },
        ok: 1,
      },
      roomObjects: {
        objects: [
          {
            downgradeTime: 71634002,
            level: 2,
            progress: 9412,
            type: 'controller',
            user: 'alice-user',
          },
        ],
        ok: 1,
      },
      roomStatus: {
        ok: 1,
        room: { status: 'normal' },
      },
    });
    stubConsoleWebSocket({
      accountId: 'alice-user',
      heartbeatLine: P4_HEARTBEAT_LINE,
      shardName: 'shard1',
    });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    try {
      const liveStatusModule = await loadLiveSurvivalStatusModule();

      await liveStatusModule.checkLiveSurvivalStatusFrom(workspacePath, [
        '--shard',
        'shard1',
        '--room',
        'W51N21',
      ]);

      expect(joinedLogLines(logSpy)).toContain(
        'recoveryStates=W51N21:spawnMissing,W51N21:rebuildBlocked recoveryBlockers=W51N21:noOwnedSupportRoom',
      );
      expect(joinedLogLines(logSpy)).not.toContain('requestRebuildSupport');
      expect(joinedLogLines(logSpy)).not.toContain('claim');
    } finally {
      await rm(workspacePath, { force: true, recursive: true });
    }
  });

  it('rejects structured heartbeat lines that lack required metrics without printing secrets', async () => {
    const workspacePath = await createLiveStatusWorkspace();
    stubLiveFetch(createMinimalLiveFetchPayloads());
    stubConsoleWebSocket({
      accountId: 'alice-user',
      heartbeatLine:
        '[HERMES_EVENT] {"schema":"screeps.ops.event.v1","id":"runtime_heartbeat:shard1:71650000","dedupeKey":"runtime_heartbeat:shard1","severity":"info","kind":"runtime_heartbeat","tick":71650000,"shard":"shard1","summary":"runtime heartbeat for 1 room(s)","metrics":{"cpu":0.63,"limit":20,"tickLimit":500,"budget":"full","rooms":[{"room":"W51N21","workerCount":5,"spawnEnergy":"300/300","constructionSiteCount":5,"hostileCount":0}]}}',
      shardName: 'shard1',
    });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    try {
      const liveStatusModule = await loadLiveSurvivalStatusModule();
      const caughtError = await liveStatusModule
        .checkLiveSurvivalStatusFrom(workspacePath, ['--shard', 'shard1', '--room', 'W51N21'])
        .then(
          () => null,
          (commandError: unknown) => commandError,
        );

      expect(caughtError).toBeInstanceOf(Error);
      expect(String(caughtError)).toContain(
        'P4 heartbeat on shard1 is missing structured bucket metric.',
      );
      expect(String(caughtError)).not.toContain('secret-token');
      expect(String(caughtError)).not.toContain('refreshed-token');
      expect(joinedLogLines(logSpy)).not.toContain('naturalTickHeartbeat=verified');
      expect(joinedLogLines(logSpy)).not.toContain('secret-token');
      expect(joinedLogLines(logSpy)).not.toContain('refreshed-token');
    } finally {
      await rm(workspacePath, { force: true, recursive: true });
    }
  });

  it('rejects P4 heartbeat lines without the configured room summary', async () => {
    const workspacePath = await createLiveStatusWorkspace();
    stubLiveFetch(createMinimalLiveFetchPayloads());
    stubConsoleWebSocket({
      accountId: 'alice-user',
      heartbeatLine:
        '[HERMES_EVENT] {"schema":"screeps.ops.event.v1","id":"runtime_heartbeat:shard1:71650000","dedupeKey":"runtime_heartbeat:shard1","severity":"info","kind":"runtime_heartbeat","tick":71650000,"shard":"shard1","summary":"runtime heartbeat for 1 room(s)","metrics":{"cpu":0.63,"bucket":9876,"limit":20,"tickLimit":500,"budget":"full","rooms":[{"room":"W1N1","workerCount":5,"spawnEnergy":"300/300","constructionSiteCount":5,"hostileCount":0}]}}',
      shardName: 'shard1',
    });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    try {
      const liveStatusModule = await loadLiveSurvivalStatusModule();
      const caughtError = await liveStatusModule
        .checkLiveSurvivalStatusFrom(workspacePath, ['--shard', 'shard1', '--room', 'W51N21'])
        .then(
          () => null,
          (commandError: unknown) => commandError,
        );

      expect(caughtError).toBeInstanceOf(Error);
      expect(String(caughtError)).toContain(
        'P4 heartbeat on shard1 did not include target room W51N21.',
      );
      expect(joinedLogLines(logSpy)).not.toContain('naturalTickHeartbeat=verified');
      expect(joinedLogLines(logSpy)).not.toContain('secret-token');
    } finally {
      await rm(workspacePath, { force: true, recursive: true });
    }
  });

  it('ignores legacy tick heartbeat lines and fails closed', async () => {
    const workspacePath = await createLiveStatusWorkspace();
    stubLiveFetch(createMinimalLiveFetchPayloads());
    stubConsoleWebSocketCloseAfterConsoleUpdate({
      accountId: 'alice-user',
      heartbeatLine:
        '[tick 71650000] cpu=0.63 bucket=9876 limit=20 tickLimit=500 budget=full rooms=W51N21:workers=5:spawnEnergy=300/300:construction=5:hostiles=0',
      shardName: 'shard1',
    });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    try {
      const liveStatusModule = await loadLiveSurvivalStatusModule();
      const caughtError = await liveStatusModule
        .checkLiveSurvivalStatusFrom(workspacePath, ['--shard', 'shard1', '--room', 'W51N21'])
        .then(
          () => null,
          (commandError: unknown) => commandError,
        );

      expect(caughtError).toBeInstanceOf(Error);
      expect(String(caughtError)).toContain(
        'Screeps console websocket closed before P4 heartbeat was observed.',
      );
      expect(joinedLogLines(logSpy)).not.toContain('naturalTickHeartbeat=verified');
      expect(joinedLogLines(logSpy)).not.toContain('secret-token');
    } finally {
      await rm(workspacePath, { force: true, recursive: true });
    }
  });

  it('rejects websocket auth failure without leaking token material', async () => {
    const workspacePath = await createLiveStatusWorkspace();
    stubLiveFetch(createMinimalLiveFetchPayloads());
    stubConsoleWebSocketAuthFailure('alice-user');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    try {
      const liveStatusModule = await loadLiveSurvivalStatusModule();
      const caughtError = await liveStatusModule
        .checkLiveSurvivalStatusFrom(workspacePath, ['--shard', 'shard1', '--room', 'W51N21'])
        .then(
          () => null,
          (commandError: unknown) => commandError,
        );

      expect(caughtError).toBeInstanceOf(Error);
      expect(String(caughtError)).toContain('Screeps console websocket authentication failed.');
      expect(String(caughtError)).not.toContain('secret-token');
      expect(String(caughtError)).not.toContain('refreshed-token');
      expect(joinedLogLines(logSpy)).not.toContain('naturalTickHeartbeat=verified');
      expect(joinedLogLines(logSpy)).not.toContain('secret-token');
      expect(joinedLogLines(logSpy)).not.toContain('refreshed-token');
    } finally {
      await rm(workspacePath, { force: true, recursive: true });
    }
  });

  it('fails closed when console heartbeat events never arrive for the target shard', async () => {
    const workspacePath = await createLiveStatusWorkspace();
    stubLiveFetch(createMinimalLiveFetchPayloads());
    stubConsoleWebSocketCloseAfterConsoleUpdate({
      accountId: 'alice-user',
      heartbeatLine: P4_HEARTBEAT_LINE,
      shardName: 'shard3',
    });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    try {
      const liveStatusModule = await loadLiveSurvivalStatusModule();
      const statusPromise = liveStatusModule.checkLiveSurvivalStatusFrom(workspacePath, [
        '--shard',
        'shard1',
        '--room',
        'W51N21',
      ]);

      const caughtError = await statusPromise.then(
        () => null,
        (commandError: unknown) => commandError,
      );

      expect(caughtError).toBeInstanceOf(Error);
      expect(String(caughtError)).toContain(
        'Screeps console websocket closed before P4 heartbeat was observed.',
      );
      expect(joinedLogLines(logSpy)).not.toContain('naturalTickHeartbeat=verified');
      expect(joinedLogLines(logSpy)).not.toContain('secret-token');
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

const createMinimalLiveFetchPayloads = (): LiveFetchPayloads => ({
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
  overview: {
    ok: 1,
    shard1: {
      rooms: ['W51N21'],
    },
  },
  roomObjects: {
    objects: [
      {
        downgradeTime: 71634002,
        level: 2,
        progress: 9412,
        type: 'controller',
        user: 'alice-user',
      },
      {
        name: 'Spawn1',
        spawning: null,
        store: { energy: 300 },
        storeCapacityResource: { energy: 300 },
        type: 'spawn',
        user: 'alice-user',
      },
    ],
    ok: 1,
  },
  roomStatus: {
    ok: 1,
    room: { status: 'normal' },
  },
});

const stubLiveFetch = (apiPayloadsByRoute: LiveFetchPayloads) => {
  const fetchRecords: FetchRecord[] = [];

  vi.stubGlobal('fetch', (requestInput: string | URL, requestInit?: RequestInit) => {
    const requestUrl = new URL(requestInput.toString());
    fetchRecords.push({
      init: requestInit,
      url: requestInput.toString(),
    });

    const apiPayload = selectLiveApiPayload(apiPayloadsByRoute, requestUrl.pathname);

    return Promise.resolve(
      new Response(JSON.stringify(apiPayload), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }),
    );
  });

  return fetchRecords;
};

const selectLiveApiPayload = (apiPayloadsByRoute: LiveFetchPayloads, apiPath: string) => {
  if (apiPath === '/api/auth/me') {
    return apiPayloadsByRoute.authMe;
  }

  if (apiPath === '/api/user/overview') {
    return apiPayloadsByRoute.overview;
  }

  if (apiPath === '/api/game/room-status') {
    return apiPayloadsByRoute.roomStatus;
  }

  if (apiPath === '/api/game/room-objects') {
    return apiPayloadsByRoute.roomObjects;
  }

  if (apiPath === '/api/user/code') {
    return apiPayloadsByRoute.remoteModules;
  }

  throw new Error(`Unexpected live API path ${apiPath}.`);
};

const stubConsoleWebSocket = (consoleScenario: ConsoleWebSocketScenario) => {
  MockConsoleWebSocket.consoleScenario = consoleScenario;
  MockConsoleWebSocket.authFailureAccountId = null;
  MockConsoleWebSocket.closeAfterConsoleUpdate = false;
  vi.stubGlobal('WebSocket', MockConsoleWebSocket);
};

const stubConsoleWebSocketCloseAfterConsoleUpdate = (consoleScenario: ConsoleWebSocketScenario) => {
  MockConsoleWebSocket.consoleScenario = consoleScenario;
  MockConsoleWebSocket.authFailureAccountId = null;
  MockConsoleWebSocket.closeAfterConsoleUpdate = true;
  vi.stubGlobal('WebSocket', MockConsoleWebSocket);
};

const stubConsoleWebSocketAuthFailure = (accountId: string) => {
  MockConsoleWebSocket.authFailureAccountId = accountId;
  MockConsoleWebSocket.closeAfterConsoleUpdate = false;
  MockConsoleWebSocket.consoleScenario = null;
  vi.stubGlobal('WebSocket', MockConsoleWebSocket);
};

const joinedLogLines = (logSpy: ConsoleLogSpy) =>
  logSpy.mock.calls.map((logCall) => logCall.map(String).join(' ')).join('\n');

class MockConsoleWebSocket {
  static authFailureAccountId: string | null = null;
  static closeAfterConsoleUpdate = false;
  static consoleScenario: ConsoleWebSocketScenario | null = null;
  static instances: MockConsoleWebSocket[] = [];

  readonly sentMessages: string[] = [];
  readonly url: string;

  onclose: ((closeEvent: unknown) => void) | null = null;
  onerror: ((errorEvent: unknown) => void) | null = null;
  onmessage: ((messageEvent: { readonly data: string }) => void) | null = null;
  onopen: ((openEvent: unknown) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockConsoleWebSocket.instances.push(this);

    setTimeout(() => {
      this.onopen?.({});
      this.emitMessage('o');
    }, 0);
  }

  send(messageText: string) {
    this.sentMessages.push(messageText);

    const authFailureAccountId = MockConsoleWebSocket.authFailureAccountId;
    if (authFailureAccountId !== null && messageText === '["auth secret-token"]') {
      setTimeout(() => this.emitMessage(wrapSockJsMessages(['auth failed'])), 0);
      return;
    }

    if (messageText === '["auth secret-token"]') {
      setTimeout(() => this.emitMessage(wrapSockJsMessages(['auth ok refreshed-token'])), 0);
      return;
    }

    const consoleScenario = MockConsoleWebSocket.consoleScenario;
    if (
      consoleScenario !== null &&
      messageText === `["subscribe user:${consoleScenario.accountId}/console"]`
    ) {
      setTimeout(() => {
        this.emitMessage(buildConsoleUpdateFrame(consoleScenario));

        if (MockConsoleWebSocket.closeAfterConsoleUpdate) {
          this.onclose?.({});
        }
      }, 0);
    }
  }

  close() {
    return undefined;
  }

  private emitMessage(frameText: string) {
    this.onmessage?.({ data: frameText });
  }
}

const buildConsoleUpdateFrame = (consoleScenario: ConsoleWebSocketScenario) =>
  wrapSockJsMessages([
    JSON.stringify([
      `user:${consoleScenario.accountId}/console`,
      {
        messages: {
          log: [consoleScenario.heartbeatLine],
          results: [],
        },
        shard: consoleScenario.shardName,
      },
    ]),
  ]);

const wrapSockJsMessages = (messages: readonly string[]) => `a${JSON.stringify(messages)}`;
