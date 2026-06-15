import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { afterEach, describe, expect, it, vi } from 'vitest';

interface FetchRecord {
  readonly init: RequestInit | undefined;
  readonly url: string;
}

interface OpsEventBridgeLiveModule {
  parseLiveBridgeArguments(commandArguments: string[]): {
    readonly claimStorePath: string | null;
    readonly maxConsoleUpdates: number | null;
    readonly maxEvents: number | null;
    readonly maxReconnects: number | null;
    readonly reconnectDelayMs: number;
    readonly shardName: string | null;
    readonly storePath: string | null;
    readonly timeoutMs: number | null;
  };
  runOpsEventBridgeLiveFrom(
    workspacePath: string,
    commandArguments: string[],
    dependencies?: {
      readonly hookCommandRunner?: (request: {
        readonly command: string;
        readonly input: string;
        readonly timeoutMs: number;
      }) => Promise<{ readonly exitCode?: number | null; readonly timedOut?: boolean }>;
      readonly hookEnvironment?: Record<string, string | undefined>;
      readonly WebSocketConstructor?: unknown;
    },
  ): Promise<
    {
      readonly actions: string[];
      readonly eventId: string;
      readonly kind: string;
      readonly severity: string;
      readonly shard: string;
      readonly suppressed: boolean;
    }[]
  >;
}

interface MockOpsEventWebSocketScenario {
  readonly eventLine?: string;
  readonly eventLines?: readonly string[];
  readonly shardName?: string;
  readonly type: 'close' | 'error' | 'event';
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

const CRITICAL_EVENT_LINE =
  '[HERMES_EVENT] {"schema":"screeps.ops.event.v1","id":"critical-1","severity":"critical","kind":"spawn_missing","tick":1,"shard":"shard1","room":"W51N21","summary":"spawn missing","metrics":{"token":"secret-token","safe":1}}';

const HEARTBEAT_EVENT_LINE =
  '[HERMES_EVENT] {"schema":"screeps.ops.event.v1","id":"runtime_heartbeat:shard1:71685567","dedupeKey":"runtime_heartbeat:shard1","severity":"info","kind":"runtime_heartbeat","tick":71685567,"shard":"shard1","summary":"runtime heartbeat","metrics":{"cpu":0.08,"bucket":10000}}';

const loadOpsEventBridgeLiveModule = async (): Promise<OpsEventBridgeLiveModule> => {
  const loadedModule: unknown = await import(
    pathToFileURL(resolve('scripts/screeps/ops-event-bridge.mjs')).href
  );

  if (!isOpsEventBridgeLiveModule(loadedModule)) {
    throw new Error('ops-event-bridge.mjs exports changed.');
  }

  return loadedModule;
};

describe('Screeps live ops event bridge', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    MockOpsEventWebSocket.instances = [];
    MockOpsEventWebSocket.scenarios = [];
  });

  it('subscribes to live console updates, stores redacted ops events, and prints decisions', async () => {
    const workspacePath = await createLiveOpsWorkspace();
    const storePath = join(workspacePath, 'events', 'live.jsonl');
    const fetchRecords = stubAuthFetch();
    MockOpsEventWebSocket.scenarios = [{ eventLine: CRITICAL_EVENT_LINE, type: 'event' }];
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    try {
      const liveBridgeModule = await loadOpsEventBridgeLiveModule();
      const decisions = await liveBridgeModule.runOpsEventBridgeLiveFrom(
        workspacePath,
        ['--store', storePath, '--max-events', '1', '--timeout-ms', '1000'],
        { WebSocketConstructor: MockOpsEventWebSocket },
      );
      const storedEvents = (await readFile(storePath, 'utf8'))
        .trim()
        .split('\n')
        .map((storedLine) => JSON.parse(storedLine) as Record<string, unknown>);

      expect(fetchRecords.map((fetchRecord) => fetchRecord.url)).toEqual([
        'https://screeps.com/api/auth/me',
      ]);
      expect(fetchRecords[0]?.init?.headers).toEqual({ 'X-Token': 'secret-token' });
      expect(MockOpsEventWebSocket.instances).toHaveLength(1);
      expect(MockOpsEventWebSocket.instances[0]?.url).toMatch(
        /^wss:\/\/screeps\.com\/socket\/\d+\/[a-z0-5]{8}\/websocket$/,
      );
      expect(MockOpsEventWebSocket.instances[0]?.url).not.toContain('secret-token');
      expect(MockOpsEventWebSocket.instances[0]?.sentMessages).toEqual([
        '["auth secret-token"]',
        '["subscribe user:alice-user/console"]',
      ]);
      expect(decisions).toEqual([
        expect.objectContaining({
          actions: ['record', 'notify', 'wake_hermes'],
          eventId: 'critical-1',
          kind: 'spawn_missing',
          room: 'W51N21',
          severity: 'critical',
          shard: 'shard1',
          suppressed: false,
        }),
      ]);
      expect(storedEvents).toMatchObject([
        {
          metrics: {
            safe: 1,
            token: '[redacted]',
          },
        },
      ]);
      expect(joinedLogLines(logSpy)).toContain('[ops:event-bridge] live=started');
      expect(joinedLogLines(logSpy)).toContain('[ops:event-bridge] liveEvents=1');
      expect(joinedLogLines(logSpy)).toContain(
        '[ops:event-bridge] delivery={"action":"notify","reason":"not-configured","status":"skipped"}',
      );
      expect(joinedLogLines(logSpy)).not.toContain('secret-token');
    } finally {
      await rm(workspacePath, { force: true, recursive: true });
    }
  });

  it('suppresses per-tick logs for record-only heartbeat events', async () => {
    const workspacePath = await createLiveOpsWorkspace();
    stubAuthFetch();
    MockOpsEventWebSocket.scenarios = [{ eventLine: HEARTBEAT_EVENT_LINE, type: 'event' }];
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    try {
      const liveBridgeModule = await loadOpsEventBridgeLiveModule();
      const decisions = await liveBridgeModule.runOpsEventBridgeLiveFrom(
        workspacePath,
        ['--max-events', '1', '--timeout-ms', '1000'],
        { WebSocketConstructor: MockOpsEventWebSocket },
      );

      expect(decisions).toEqual([
        expect.objectContaining({
          actions: ['record'],
          eventId: 'runtime_heartbeat:shard1:71685567',
          kind: 'runtime_heartbeat',
          severity: 'info',
          suppressed: false,
        }),
      ]);
      expect(joinedLogLines(logSpy)).toContain('[ops:event-bridge] liveEvents=1');
      expect(joinedLogLines(logSpy)).not.toContain('[ops:event-bridge] decision=');
      expect(joinedLogLines(logSpy)).not.toContain('[ops:event-bridge] delivery=');
    } finally {
      await rm(workspacePath, { force: true, recursive: true });
    }
  });

  it('runs a configured notify hook with redacted event payload', async () => {
    const workspacePath = await createLiveOpsWorkspace();
    const hookRequests: {
      readonly command: string;
      readonly input: string;
      readonly timeoutMs: number;
    }[] = [];
    stubAuthFetch();
    MockOpsEventWebSocket.scenarios = [{ eventLine: CRITICAL_EVENT_LINE, type: 'event' }];
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    try {
      const liveBridgeModule = await loadOpsEventBridgeLiveModule();
      await liveBridgeModule.runOpsEventBridgeLiveFrom(
        workspacePath,
        ['--max-events', '1', '--timeout-ms', '1000'],
        {
          hookCommandRunner: (hookRequest) => {
            hookRequests.push(hookRequest);
            return Promise.resolve({ exitCode: 0 });
          },
          hookEnvironment: { SCREEPS_OPS_NOTIFY_COMMAND: 'notify-hook' },
          WebSocketConstructor: MockOpsEventWebSocket,
        },
      );

      expect(hookRequests).toHaveLength(1);
      expect(hookRequests[0]?.command).toBe('notify-hook');
      expect(hookRequests[0]?.timeoutMs).toBe(10000);
      const hookPayload = JSON.parse(hookRequests[0]?.input ?? '{}') as Record<string, unknown>;
      expect(hookPayload).toMatchObject({
        action: 'notify',
        decision: {
          actions: ['record', 'notify', 'wake_hermes'],
          dedupeKey: 'critical:spawn_missing:shard1:W51N21',
          suppressed: false,
        },
        event: {
          id: 'critical-1',
          kind: 'spawn_missing',
          metrics: {
            safe: 1,
            token: '[redacted]',
          },
        },
        source: 'screeps-ops-event-bridge',
      });
      expect(typeof hookPayload['observedAt']).toBe('string');
      expect(joinedLogLines(logSpy)).toContain(
        '[ops:event-bridge] delivery={"action":"notify","status":"delivered"}',
      );
      expect(joinedLogLines(logSpy)).not.toContain('secret-token');
      expect(hookRequests[0]?.input).not.toContain('secret-token');
    } finally {
      await rm(workspacePath, { force: true, recursive: true });
    }
  });

  it('does not run notify hooks for duplicate active events in the same claim window', async () => {
    const workspacePath = await createLiveOpsWorkspace();
    const hookRequests: unknown[] = [];
    stubAuthFetch();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    MockOpsEventWebSocket.scenarios = [
      {
        eventLines: [
          CRITICAL_EVENT_LINE,
          '[HERMES_EVENT] {"schema":"screeps.ops.event.v1","id":"critical-2","severity":"critical","kind":"spawn_missing","tick":2,"shard":"shard1","room":"W51N21","summary":"spawn still missing"}',
        ],
        type: 'event',
      },
    ];

    try {
      const liveBridgeModule = await loadOpsEventBridgeLiveModule();
      const decisions = await liveBridgeModule.runOpsEventBridgeLiveFrom(
        workspacePath,
        ['--max-events', '2', '--timeout-ms', '1000'],
        {
          hookCommandRunner: (hookRequest) => {
            hookRequests.push(hookRequest);
            return Promise.resolve({ exitCode: 0 });
          },
          hookEnvironment: { SCREEPS_OPS_NOTIFY_COMMAND: 'notify-hook' },
          WebSocketConstructor: MockOpsEventWebSocket,
        },
      );

      expect(decisions).toEqual([
        expect.objectContaining({ eventId: 'critical-1', suppressed: false }),
        expect.objectContaining({ eventId: 'critical-2', suppressed: true }),
      ]);
      expect(hookRequests).toHaveLength(1);
      expect(joinedLogLines(logSpy)).not.toContain('secret-token');
    } finally {
      await rm(workspacePath, { force: true, recursive: true });
    }
  });

  it('reconnects after a console websocket close before the event limit is reached', async () => {
    const workspacePath = await createLiveOpsWorkspace();
    stubAuthFetch();
    MockOpsEventWebSocket.scenarios = [
      { type: 'close' },
      { eventLine: CRITICAL_EVENT_LINE, type: 'event' },
    ];
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    try {
      const liveBridgeModule = await loadOpsEventBridgeLiveModule();
      const decisions = await liveBridgeModule.runOpsEventBridgeLiveFrom(
        workspacePath,
        [
          '--max-events',
          '1',
          '--max-reconnects',
          '1',
          '--reconnect-delay-ms',
          '0',
          '--timeout-ms',
          '1000',
        ],
        { WebSocketConstructor: MockOpsEventWebSocket },
      );

      expect(MockOpsEventWebSocket.instances).toHaveLength(2);
      expect(decisions).toHaveLength(1);
      expect(joinedLogLines(logSpy)).toContain('[ops:event-bridge] reconnect=1');
      expect(joinedLogLines(logSpy)).not.toContain('secret-token');
    } finally {
      await rm(workspacePath, { force: true, recursive: true });
    }
  });

  it('reconnects after a console websocket error before the event limit is reached', async () => {
    const workspacePath = await createLiveOpsWorkspace();
    stubAuthFetch();
    MockOpsEventWebSocket.scenarios = [
      { type: 'error' },
      { eventLine: CRITICAL_EVENT_LINE, type: 'event' },
    ];
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    try {
      const liveBridgeModule = await loadOpsEventBridgeLiveModule();
      const decisions = await liveBridgeModule.runOpsEventBridgeLiveFrom(
        workspacePath,
        [
          '--max-events',
          '1',
          '--max-reconnects',
          '1',
          '--reconnect-delay-ms',
          '0',
          '--timeout-ms',
          '1000',
        ],
        { WebSocketConstructor: MockOpsEventWebSocket },
      );

      expect(MockOpsEventWebSocket.instances).toHaveLength(2);
      expect(decisions).toHaveLength(1);
      expect(joinedLogLines(logSpy)).toContain('[ops:event-bridge] reconnect=1');
      expect(joinedLogLines(logSpy)).not.toContain('secret-token');
    } finally {
      await rm(workspacePath, { force: true, recursive: true });
    }
  });

  it('does not process extra events from the same console update after max-events is reached', async () => {
    const workspacePath = await createLiveOpsWorkspace();
    const storePath = join(workspacePath, 'events', 'live.jsonl');
    stubAuthFetch();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    MockOpsEventWebSocket.scenarios = [
      {
        eventLines: [
          CRITICAL_EVENT_LINE,
          '[HERMES_EVENT] {"schema":"screeps.ops.event.v1","id":"critical-2","severity":"critical","kind":"spawn_missing","tick":2,"shard":"shard1","room":"W51N21","summary":"spawn still missing"}',
        ],
        type: 'event',
      },
    ];

    try {
      const liveBridgeModule = await loadOpsEventBridgeLiveModule();
      const decisions = await liveBridgeModule.runOpsEventBridgeLiveFrom(
        workspacePath,
        ['--store', storePath, '--max-events', '1', '--timeout-ms', '1000'],
        { WebSocketConstructor: MockOpsEventWebSocket },
      );
      const storedLines = (await readFile(storePath, 'utf8')).trim().split('\n');

      expect(decisions.map((decision) => decision.eventId)).toEqual(['critical-1']);
      expect(storedLines).toHaveLength(1);
      expect(storedLines[0]).toContain('critical-1');
      expect(joinedLogLines(logSpy)).not.toContain('secret-token');
    } finally {
      await rm(workspacePath, { force: true, recursive: true });
    }
  });

  it('logs malformed live ops events without terminating the bridge', async () => {
    const workspacePath = await createLiveOpsWorkspace();
    stubAuthFetch();
    MockOpsEventWebSocket.scenarios = [
      {
        eventLines: ['[HERMES_EVENT] {bad json'],
        type: 'event',
      },
    ];
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    try {
      const liveBridgeModule = await loadOpsEventBridgeLiveModule();
      const decisions = await liveBridgeModule.runOpsEventBridgeLiveFrom(
        workspacePath,
        ['--max-console-updates', '1', '--timeout-ms', '1000'],
        { WebSocketConstructor: MockOpsEventWebSocket },
      );

      expect(decisions).toEqual([]);
      expect(joinedLogLines(logSpy)).toContain('[ops:event-bridge] parseError=');
      expect(joinedLogLines(logSpy)).toContain('Ops event line contains invalid JSON.');
      expect(joinedLogLines(logSpy)).not.toContain('{bad json');
      expect(joinedLogLines(logSpy)).not.toContain('secret-token');
    } finally {
      await rm(workspacePath, { force: true, recursive: true });
    }
  });

  it('fails closed when reconnect limit is reached before an event arrives', async () => {
    const workspacePath = await createLiveOpsWorkspace();
    stubAuthFetch();
    MockOpsEventWebSocket.scenarios = [{ type: 'close' }];
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    try {
      const liveBridgeModule = await loadOpsEventBridgeLiveModule();
      const caughtError = await liveBridgeModule
        .runOpsEventBridgeLiveFrom(
          workspacePath,
          ['--max-events', '1', '--max-reconnects', '0', '--timeout-ms', '1000'],
          { WebSocketConstructor: MockOpsEventWebSocket },
        )
        .then(
          () => null,
          (commandError: unknown) => commandError,
        );

      expect(caughtError).toBeInstanceOf(Error);
      expect(String(caughtError)).toContain('Screeps console websocket reconnect limit reached.');
      expect(joinedLogLines(logSpy)).not.toContain('secret-token');
    } finally {
      await rm(workspacePath, { force: true, recursive: true });
    }
  });

  it('can finish a bounded live smoke after a console update without ops events', async () => {
    const workspacePath = await createLiveOpsWorkspace();
    stubAuthFetch();
    MockOpsEventWebSocket.scenarios = [
      {
        eventLine:
          '[tick 1] cpu=0.10 bucket=10000 limit=20 tickLimit=500 budget=full rooms=W51N21:workers=5:spawnEnergy=300/300:construction=4:hostiles=0',
        type: 'event',
      },
    ];
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    try {
      const liveBridgeModule = await loadOpsEventBridgeLiveModule();
      const decisions = await liveBridgeModule.runOpsEventBridgeLiveFrom(
        workspacePath,
        ['--max-console-updates', '1', '--timeout-ms', '1000'],
        { WebSocketConstructor: MockOpsEventWebSocket },
      );

      expect(decisions).toEqual([]);
      expect(joinedLogLines(logSpy)).toContain('[ops:event-bridge] liveEvents=0 consoleUpdates=1');
    } finally {
      await rm(workspacePath, { force: true, recursive: true });
    }
  });

  it('parses bounded live bridge arguments', async () => {
    const liveBridgeModule = await loadOpsEventBridgeLiveModule();

    expect(
      liveBridgeModule.parseLiveBridgeArguments([
        '--',
        '--store-default',
        '--max-events',
        '2',
        '--max-console-updates',
        '3',
        '--timeout-ms',
        '1000',
        '--max-reconnects',
        '0',
        '--reconnect-delay-ms',
        '0',
        '--shard',
        'shard1',
      ]),
    ).toMatchObject({
      maxConsoleUpdates: 3,
      maxEvents: 2,
      maxReconnects: 0,
      reconnectDelayMs: 0,
      shardName: 'shard1',
      timeoutMs: 1000,
    });
  });

  it('rejects invalid live bridge arguments before connecting', async () => {
    const liveBridgeModule = await loadOpsEventBridgeLiveModule();

    expect(() => liveBridgeModule.parseLiveBridgeArguments(['--unknown'])).toThrow(
      'Unknown argument "--unknown".',
    );
    expect(() => liveBridgeModule.parseLiveBridgeArguments(['--store'])).toThrow(
      'Missing value after --store.',
    );
    expect(() => liveBridgeModule.parseLiveBridgeArguments(['--max-events', '0'])).toThrow(
      '--max-events must be greater than 0.',
    );
    expect(() => liveBridgeModule.parseLiveBridgeArguments(['--max-reconnects', '-1'])).toThrow(
      '--max-reconnects must be zero or greater.',
    );
    expect(() => liveBridgeModule.parseLiveBridgeArguments(['--timeout-ms', '1.5'])).toThrow(
      '--timeout-ms must be an integer.',
    );
  });

  it('rejects dry-run arguments at the live bridge boundary', async () => {
    const liveBridgeModule = await loadOpsEventBridgeLiveModule();

    expect(() =>
      liveBridgeModule.parseLiveBridgeArguments(['--dry-run-line', '[HERMES_EVENT] {}']),
    ).toThrow('Use ops-event-bridge-dry-run.mjs for dry-run input');
  });
});

class MockOpsEventWebSocket {
  static instances: MockOpsEventWebSocket[] = [];
  static scenarios: MockOpsEventWebSocketScenario[] = [];

  readonly scenario: MockOpsEventWebSocketScenario;
  readonly sentMessages: string[] = [];
  readonly url: string;

  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((messageEvent: { readonly data: string }) => void) | null = null;

  constructor(url: string) {
    const scenario = MockOpsEventWebSocket.scenarios.shift();

    if (scenario === undefined) {
      throw new Error('Missing mock websocket scenario.');
    }

    this.scenario = scenario;
    this.url = url;
    MockOpsEventWebSocket.instances.push(this);

    queueMicrotask(() => this.emitMessage('o'));
  }

  close() {
    // The bridge may close a successful mock connection after reaching --max-events.
  }

  send(messageText: string) {
    this.sentMessages.push(messageText);

    if (messageText === '["auth secret-token"]') {
      queueMicrotask(() => this.emitMessage(`a${JSON.stringify(['auth ok'])}`));
      return;
    }

    if (messageText === '["subscribe user:alice-user/console"]') {
      if (this.scenario.type === 'close') {
        queueMicrotask(() => this.onclose?.());
        return;
      }

      if (this.scenario.type === 'error') {
        queueMicrotask(() => this.onerror?.());
        return;
      }

      queueMicrotask(() => this.emitMessage(buildConsoleUpdateFrame(this.scenario)));
    }
  }

  private emitMessage(data: string) {
    this.onmessage?.({ data });
  }
}

const buildConsoleUpdateFrame = (scenario: MockOpsEventWebSocketScenario) => {
  const consoleUpdateMessage = JSON.stringify([
    'user:alice-user/console',
    {
      messages: {
        log: [
          '[tick 1] cpu=0.10 bucket=10000 limit=20 tickLimit=500 budget=full rooms=W51N21:workers=5:spawnEnergy=300/300:construction=4:hostiles=0',
          ...(scenario.eventLines ?? [scenario.eventLine ?? CRITICAL_EVENT_LINE]),
        ],
      },
      shard: scenario.shardName ?? 'shard1',
    },
  ]);

  return `a${JSON.stringify([consoleUpdateMessage])}`;
};

const createLiveOpsWorkspace = async () => {
  const workspacePath = await mkdtemp(join(tmpdir(), 'screeps-live-ops-'));

  await writeFile(join(workspacePath, 'screeps.json'), SCREEPS_CONFIG_TEXT);

  return workspacePath;
};

const stubAuthFetch = () => {
  const fetchRecords: FetchRecord[] = [];

  vi.stubGlobal('fetch', (requestInput: string | URL, requestInit?: RequestInit) => {
    fetchRecords.push({
      init: requestInit,
      url: requestInput.toString(),
    });

    return Promise.resolve(
      new Response(JSON.stringify({ _id: 'alice-user', ok: 1, username: 'Alice' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }),
    );
  });

  return fetchRecords;
};

const joinedLogLines = (logSpy: ConsoleLogSpy) =>
  logSpy.mock.calls.map((callArguments) => callArguments.join(' ')).join('\n');

const isOpsEventBridgeLiveModule = (
  candidateModule: unknown,
): candidateModule is OpsEventBridgeLiveModule =>
  typeof candidateModule === 'object' &&
  candidateModule !== null &&
  'parseLiveBridgeArguments' in candidateModule &&
  typeof candidateModule.parseLiveBridgeArguments === 'function' &&
  'runOpsEventBridgeLiveFrom' in candidateModule &&
  typeof candidateModule.runOpsEventBridgeLiveFrom === 'function';
