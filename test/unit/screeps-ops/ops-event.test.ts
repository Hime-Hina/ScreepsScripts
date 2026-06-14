import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { describe, expect, it, vi } from 'vitest';

interface OpsEventModule {
  appendOpsEventToJsonl(storePath: string, opsEvent: Record<string, unknown>): Promise<void>;
  createOpsEventPolicyState(): unknown;
  decideOpsEventActions(
    opsEvent: Record<string, unknown>,
    policyState?: unknown,
  ): { actions: string[]; dedupeKey: string; suppressed: boolean };
  parseOpsEventLine(consoleLine: string): Record<string, unknown> | null;
}

interface OpsEventBridgeModule {
  parseDryRunArguments(commandArguments: string[]): {
    inputFile: string | null;
    inputLine: string | null;
    storePath: string | null;
  };
  readDefaultEventStorePath(clock?: Date): string;
  runOpsEventBridgeDryRun(commandArguments: string[]): Promise<
    {
      actions: string[];
      dedupeKey: string;
      eventId: string;
      kind: string;
      severity: string;
      suppressed: boolean;
    }[]
  >;
}

const loadOpsEventModule = async (): Promise<OpsEventModule> => {
  const loadedModule: unknown = await import(
    pathToFileURL(resolve('scripts/screeps/ops-event.mjs')).href
  );

  if (!isOpsEventModule(loadedModule)) {
    throw new Error('ops-event.mjs exports changed.');
  }

  return loadedModule;
};

const loadOpsEventBridgeModule = async (): Promise<OpsEventBridgeModule> => {
  const loadedModule: unknown = await import(
    pathToFileURL(resolve('scripts/screeps/ops-event-bridge.mjs')).href
  );

  if (!isOpsEventBridgeModule(loadedModule)) {
    throw new Error('ops-event-bridge.mjs exports changed.');
  }

  return loadedModule;
};

describe('Screeps ops event parser', () => {
  it('parses structured Hermes event console lines', async () => {
    const opsEventModule = await loadOpsEventModule();

    const opsEvent = opsEventModule.parseOpsEventLine(
      '[HERMES_EVENT] {"schema":"screeps.ops.event.v1","id":"worker-low-1","severity":"actionable","kind":"worker_below_target","tick":42,"shard":"shard1","room":"W51N21","summary":"worker count below target","metrics":{"workers":2,"target":3}}',
    );

    expect(opsEvent).toMatchObject({
      id: 'worker-low-1',
      kind: 'worker_below_target',
      metrics: {
        target: 3,
        workers: 2,
      },
      room: 'W51N21',
      schema: 'screeps.ops.event.v1',
      severity: 'actionable',
      shard: 'shard1',
      summary: 'worker count below target',
      tick: 42,
    });
  });

  it('accepts event JSON immediately after the prefix for emitter compatibility', async () => {
    const opsEventModule = await loadOpsEventModule();

    const opsEvent = opsEventModule.parseOpsEventLine(
      '[HERMES_EVENT]{"schema":"screeps.ops.event.v1","id":"worker-low-compact","severity":"actionable","kind":"worker_below_target","tick":42,"shard":"shard1","summary":"worker count below target"}',
    );

    expect(opsEvent).toMatchObject({
      id: 'worker-low-compact',
      kind: 'worker_below_target',
    });
  });

  it('ignores normal console heartbeat lines', async () => {
    const opsEventModule = await loadOpsEventModule();

    expect(
      opsEventModule.parseOpsEventLine(
        '[tick 42] cpu=0.10 bucket=10000 limit=20 tickLimit=500 budget=full rooms=W51N21:workers=5',
      ),
    ).toBeNull();
  });

  it('rejects malformed structured events without leaking payload details', async () => {
    const opsEventModule = await loadOpsEventModule();

    expect(() => opsEventModule.parseOpsEventLine('[HERMES_EVENT] {bad json')).toThrow(
      'Ops event line contains invalid JSON.',
    );
  });

  it('redacts sensitive metric keys before persistence or policy use', async () => {
    const opsEventModule = await loadOpsEventModule();

    const opsEvent = opsEventModule.parseOpsEventLine(
      '[HERMES_EVENT] {"schema":"screeps.ops.event.v1","id":"secret-test","severity":"critical","kind":"token_probe","tick":7,"shard":"shard1","summary":"secret should be redacted","metrics":{"token":"ptr-secret-token","nested":{"password":"pw","safe":1},"snapshots":[{"authorization":"Bearer secret","safe":2}],"cookieValues":["secret-cookie"]}}',
    );

    expect(opsEvent).toMatchObject({
      metrics: {
        cookieValues: '[redacted]',
        nested: {
          password: '[redacted]',
          safe: 1,
        },
        snapshots: [
          {
            authorization: '[redacted]',
            safe: 2,
          },
        ],
        token: '[redacted]',
      },
    });
  });
});

describe('Screeps ops event store and policy', () => {
  it('appends normalized events as JSONL', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'screeps-ops-events-'));
    const storePath = join(workspacePath, 'events', 'live.jsonl');
    const opsEventModule = await loadOpsEventModule();

    try {
      const firstEvent = opsEventModule.parseOpsEventLine(
        '[HERMES_EVENT] {"schema":"screeps.ops.event.v1","id":"event-1","severity":"info","kind":"heartbeat","tick":1,"shard":"shard1","summary":"ok"}',
      );
      const secondEvent = opsEventModule.parseOpsEventLine(
        '[HERMES_EVENT] {"schema":"screeps.ops.event.v1","id":"event-2","severity":"warning","kind":"cpu_bucket_low","tick":2,"shard":"shard1","summary":"bucket low"}',
      );

      if (firstEvent === null || secondEvent === null) {
        throw new Error('Expected structured events.');
      }

      await opsEventModule.appendOpsEventToJsonl(storePath, firstEvent);
      await opsEventModule.appendOpsEventToJsonl(storePath, secondEvent);

      const storedLines = (await readFile(storePath, 'utf8')).trim().split('\n');

      const storedEvents: unknown[] = storedLines.map(
        (storedLine: string) => JSON.parse(storedLine) as unknown,
      );

      expect(storedEvents).toEqual([firstEvent, secondEvent]);
    } finally {
      await rm(workspacePath, { force: true, recursive: true });
    }
  });

  it('records info events without waking Hermes', async () => {
    const opsEventModule = await loadOpsEventModule();
    const opsEvent = opsEventModule.parseOpsEventLine(
      '[HERMES_EVENT] {"schema":"screeps.ops.event.v1","id":"heartbeat-1","severity":"info","kind":"heartbeat","tick":10,"shard":"shard1","summary":"ok"}',
    );

    if (opsEvent === null) {
      throw new Error('Expected structured event.');
    }

    expect(opsEventModule.decideOpsEventActions(opsEvent)).toMatchObject({
      actions: ['record'],
      suppressed: false,
    });
  });

  it('wakes Hermes for actionable events and suppresses repeated cooldown events', async () => {
    const opsEventModule = await loadOpsEventModule();
    const policyState = opsEventModule.createOpsEventPolicyState();
    const firstEvent = opsEventModule.parseOpsEventLine(
      '[HERMES_EVENT] {"schema":"screeps.ops.event.v1","id":"worker-low-1","severity":"actionable","kind":"worker_below_target","tick":100,"shard":"shard1","room":"W51N21","summary":"worker count below target","cooldownTicks":50}',
    );
    const repeatedEvent = opsEventModule.parseOpsEventLine(
      '[HERMES_EVENT] {"schema":"screeps.ops.event.v1","id":"worker-low-2","severity":"actionable","kind":"worker_below_target","tick":120,"shard":"shard1","room":"W51N21","summary":"worker count still below target","cooldownTicks":50}',
    );

    if (firstEvent === null || repeatedEvent === null) {
      throw new Error('Expected structured events.');
    }

    expect(opsEventModule.decideOpsEventActions(firstEvent, policyState)).toMatchObject({
      actions: ['record', 'wake_hermes'],
      suppressed: false,
    });
    expect(opsEventModule.decideOpsEventActions(repeatedEvent, policyState)).toMatchObject({
      actions: ['record'],
      suppressed: true,
    });
  });

  it('notifies and wakes Hermes for critical events', async () => {
    const opsEventModule = await loadOpsEventModule();
    const opsEvent = opsEventModule.parseOpsEventLine(
      '[HERMES_EVENT] {"schema":"screeps.ops.event.v1","id":"spawn-missing-1","severity":"critical","kind":"spawn_missing","tick":200,"shard":"shard1","room":"W51N21","summary":"spawn missing"}',
    );

    if (opsEvent === null) {
      throw new Error('Expected structured event.');
    }

    expect(opsEventModule.decideOpsEventActions(opsEvent)).toMatchObject({
      actions: ['record', 'notify', 'wake_hermes'],
      suppressed: false,
    });
  });
});

describe('Screeps ops event bridge dry-run', () => {
  it('uses a day-scoped default event store path', async () => {
    const opsEventBridgeModule = await loadOpsEventBridgeModule();

    expect(opsEventBridgeModule.readDefaultEventStorePath(new Date('2026-06-14T01:02:03Z'))).toBe(
      join('.screeps/events', '2026-06-14.jsonl'),
    );
    const parsedArguments = opsEventBridgeModule.parseDryRunArguments([
      '--dry-run-line',
      '[HERMES_EVENT] {}',
      '--store-default',
    ]);

    expect(parsedArguments.storePath).toMatch(
      /^\.screeps[\\/]events[\\/]\d{4}-\d{2}-\d{2}\.jsonl$/,
    );
  });

  it('processes dry-run files while ignoring non-event lines and storing redacted events', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'screeps-ops-bridge-'));
    const inputPath = join(workspacePath, 'console.log');
    const storePath = join(workspacePath, 'events.jsonl');
    const opsEventBridgeModule = await loadOpsEventBridgeModule();
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    try {
      await writeFile(
        inputPath,
        [
          '[tick 1] cpu=0.10 bucket=10000',
          '[HERMES_EVENT] {"schema":"screeps.ops.event.v1","id":"critical-1","severity":"critical","kind":"spawn_missing","tick":1,"shard":"shard1","summary":"spawn missing","metrics":{"samples":[{"authorization":"Bearer secret","safe":1}]}}',
          '[HERMES_EVENT] {"schema":"screeps.ops.event.v1","id":"critical-2","severity":"critical","kind":"spawn_missing","tick":2,"shard":"shard1","summary":"spawn still missing"}',
        ].join('\n'),
        'utf8',
      );

      const decisions = await opsEventBridgeModule.runOpsEventBridgeDryRun([
        '--dry-run-file',
        inputPath,
        '--store',
        storePath,
      ]);
      const storedLines = (await readFile(storePath, 'utf8')).trim().split('\n');
      const storedEvents = storedLines.map(
        (storedLine: string) => JSON.parse(storedLine) as unknown,
      );

      expect(decisions).toEqual([
        expect.objectContaining({
          actions: ['record', 'notify', 'wake_hermes'],
          eventId: 'critical-1',
          suppressed: false,
        }),
        expect.objectContaining({
          actions: ['record'],
          eventId: 'critical-2',
          suppressed: true,
        }),
      ]);
      expect(storedEvents).toMatchObject([
        {
          metrics: {
            samples: [
              {
                authorization: '[redacted]',
                safe: 1,
              },
            ],
          },
        },
        {
          id: 'critical-2',
        },
      ]);
    } finally {
      consoleLogSpy.mockRestore();
      await rm(workspacePath, { force: true, recursive: true });
    }
  });
});

const isOpsEventModule = (candidateModule: unknown): candidateModule is OpsEventModule =>
  typeof candidateModule === 'object' &&
  candidateModule !== null &&
  'appendOpsEventToJsonl' in candidateModule &&
  typeof candidateModule.appendOpsEventToJsonl === 'function' &&
  'createOpsEventPolicyState' in candidateModule &&
  typeof candidateModule.createOpsEventPolicyState === 'function' &&
  'decideOpsEventActions' in candidateModule &&
  typeof candidateModule.decideOpsEventActions === 'function' &&
  'parseOpsEventLine' in candidateModule &&
  typeof candidateModule.parseOpsEventLine === 'function';

const isOpsEventBridgeModule = (
  candidateModule: unknown,
): candidateModule is OpsEventBridgeModule =>
  typeof candidateModule === 'object' &&
  candidateModule !== null &&
  'parseDryRunArguments' in candidateModule &&
  typeof candidateModule.parseDryRunArguments === 'function' &&
  'readDefaultEventStorePath' in candidateModule &&
  typeof candidateModule.readDefaultEventStorePath === 'function' &&
  'runOpsEventBridgeDryRun' in candidateModule &&
  typeof candidateModule.runOpsEventBridgeDryRun === 'function';
