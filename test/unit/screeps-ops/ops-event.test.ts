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
    claimStorePath: string | null;
    inputFile: string | null;
    inputLine: string | null;
    source: string;
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

interface OpsEventEmailFallbackModule {
  parseEmailFallbackArguments(commandArguments: string[]): {
    claimStorePath: string | null;
    eventLine: string | null;
    messageFile: string | null;
  };
  runOpsEventEmailFallback(commandArguments: string[]): Promise<{
    actions?: string[];
    dedupeKey?: string;
    duplicate?: boolean;
    eventId?: string;
    fallback: string;
    kind?: string;
    suppressed?: boolean;
  }>;
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
    pathToFileURL(resolve('scripts/screeps/ops-event-bridge-dry-run.mjs')).href
  );

  if (!isOpsEventBridgeModule(loadedModule)) {
    throw new Error('ops-event-bridge-dry-run.mjs exports changed.');
  }

  return loadedModule;
};

const loadOpsEventEmailFallbackModule = async (): Promise<OpsEventEmailFallbackModule> => {
  const loadedModule: unknown = await import(
    pathToFileURL(resolve('scripts/screeps/ops-event-email-fallback.mjs')).href
  );

  if (!isOpsEventEmailFallbackModule(loadedModule)) {
    throw new Error('ops-event-email-fallback.mjs exports changed.');
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

  it('accepts Screeps console HTML-escaped structured events', async () => {
    const opsEventModule = await loadOpsEventModule();

    const opsEvent = opsEventModule.parseOpsEventLine(
      '[HERMES_EVENT] {&#x22;schema&#x22;:&#x22;screeps.ops.event.v1&#x22;,&#x22;id&#x22;:&#x22;runtime_heartbeat:shard1:71683646&#x22;,&#x22;dedupeKey&#x22;:&#x22;runtime_heartbeat:shard1&#x22;,&#x22;severity&#x22;:&#x22;info&#x22;,&#x22;kind&#x22;:&#x22;runtime_heartbeat&#x22;,&#x22;tick&#x22;:71683646,&#x22;shard&#x22;:&#x22;shard1&#x22;,&#x22;summary&#x22;:&#x22;runtime heartbeat for 1 room(s)&#x22;,&#x22;metrics&#x22;:{&#x22;cpu&#x22;:0.12,&#x22;bucket&#x22;:10000}}',
    );

    expect(opsEvent).toMatchObject({
      dedupeKey: 'runtime_heartbeat:shard1',
      id: 'runtime_heartbeat:shard1:71683646',
      kind: 'runtime_heartbeat',
      metrics: {
        bucket: 10000,
        cpu: 0.12,
      },
      severity: 'info',
      shard: 'shard1',
      tick: 71683646,
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

  it('lets a single claim owner suppress duplicate console/email active actions', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'screeps-ops-claims-'));
    const claimStorePath = join(workspacePath, 'claims');
    const opsEventBridgeModule = await loadOpsEventBridgeModule();
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const eventLine =
      '[HERMES_EVENT] {"schema":"screeps.ops.event.v1","id":"critical-console-1","dedupeKey":"spawn_missing:shard1:W51N21","severity":"critical","kind":"spawn_missing","tick":1,"shard":"shard1","room":"W51N21","summary":"spawn missing"}';

    try {
      const consoleDecisions = await opsEventBridgeModule.runOpsEventBridgeDryRun([
        '--dry-run-line',
        eventLine,
        '--claim-store',
        claimStorePath,
        '--source',
        'console',
      ]);
      const emailDecisions = await opsEventBridgeModule.runOpsEventBridgeDryRun([
        '--dry-run-line',
        eventLine,
        '--claim-store',
        claimStorePath,
        '--source',
        'email',
      ]);

      expect(consoleDecisions).toEqual([
        expect.objectContaining({
          actions: ['record', 'notify', 'wake_hermes'],
          claimOwner: 'console',
          duplicate: false,
          suppressed: false,
        }),
      ]);
      expect(emailDecisions).toEqual([
        expect.objectContaining({
          actions: ['record'],
          claimOwner: 'console',
          duplicate: true,
          suppressed: true,
        }),
      ]);
    } finally {
      consoleLogSpy.mockRestore();
      await rm(workspacePath, { force: true, recursive: true });
    }
  });
});

describe('Screeps ops event email fallback', () => {
  it('parses email fallback arguments and rejects ambiguous input', async () => {
    const emailFallbackModule = await loadOpsEventEmailFallbackModule();

    expect(
      emailFallbackModule.parseEmailFallbackArguments([
        '--',
        '--message-file',
        'message.txt',
        '--claim-store-default',
      ]),
    ).toMatchObject({
      eventLine: null,
      messageFile: 'message.txt',
    });
    expect(
      emailFallbackModule.parseEmailFallbackArguments([
        '--event-line',
        '[HERMES_EVENT] {}',
        '--no-claim-store',
      ]),
    ).toEqual({
      claimStorePath: null,
      eventLine: '[HERMES_EVENT] {}',
      messageFile: null,
    });
    expect(() => emailFallbackModule.parseEmailFallbackArguments(['--unknown'])).toThrow(
      'Unknown argument "--unknown".',
    );
    expect(() => emailFallbackModule.parseEmailFallbackArguments(['--event-line'])).toThrow(
      'Missing value after --event-line.',
    );
    expect(() =>
      emailFallbackModule.parseEmailFallbackArguments([
        '--event-line',
        '[HERMES_EVENT] {}',
        '--message-file',
        'message.txt',
      ]),
    ).toThrow('Specify only one of --event-line or --message-file.');
  });

  it('claims the first critical fallback and suppresses duplicates', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'screeps-ops-email-'));
    const claimStorePath = join(workspacePath, 'claims');
    const emailFallbackModule = await loadOpsEventEmailFallbackModule();
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const eventLine =
      '[HERMES_EVENT] {"schema":"screeps.ops.event.v1","id":"critical-email-1","dedupeKey":"controller_downgrade_critical:shard1:W51N21","severity":"critical","kind":"controller_downgrade_critical","tick":500,"shard":"shard1","room":"W51N21","summary":"controller downgrade critical"}';

    try {
      const firstResult = await emailFallbackModule.runOpsEventEmailFallback([
        '--event-line',
        eventLine,
        '--claim-store',
        claimStorePath,
      ]);
      const secondResult = await emailFallbackModule.runOpsEventEmailFallback([
        '--event-line',
        eventLine,
        '--claim-store',
        claimStorePath,
      ]);

      expect(firstResult).toMatchObject({
        actions: ['record', 'notify', 'wake_hermes'],
        duplicate: false,
        fallback: 'claimed',
        suppressed: false,
      });
      expect(secondResult).toMatchObject({
        actions: ['record'],
        claimOwner: 'email',
        duplicate: true,
        fallback: 'duplicate',
        suppressed: true,
      });
    } finally {
      consoleLogSpy.mockRestore();
      await rm(workspacePath, { force: true, recursive: true });
    }
  });

  it('extracts structured events from message files and ignores messages without events', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'screeps-ops-email-file-'));
    const claimStorePath = join(workspacePath, 'claims');
    const criticalMessagePath = join(workspacePath, 'critical-email.txt');
    const emptyMessagePath = join(workspacePath, 'empty-email.txt');
    const emailFallbackModule = await loadOpsEventEmailFallbackModule();
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    try {
      await writeFile(
        criticalMessagePath,
        [
          'Screeps alert fallback',
          '[HERMES_EVENT] {"schema":"screeps.ops.event.v1","id":"critical-file-1","dedupeKey":"spawn_missing:shard1:W51N21","severity":"critical","kind":"spawn_missing","tick":600,"shard":"shard1","room":"W51N21","summary":"spawn missing"}',
        ].join('\n'),
        'utf8',
      );
      await writeFile(emptyMessagePath, 'plain Game.notify body without structured event', 'utf8');

      await expect(
        emailFallbackModule.runOpsEventEmailFallback([
          '--message-file',
          criticalMessagePath,
          '--claim-store',
          claimStorePath,
        ]),
      ).resolves.toMatchObject({
        eventId: 'critical-file-1',
        fallback: 'claimed',
        kind: 'spawn_missing',
      });
      await expect(
        emailFallbackModule.runOpsEventEmailFallback(['--message-file', emptyMessagePath]),
      ).resolves.toMatchObject({
        fallback: 'ignored',
        reason: 'no-structured-event',
      });
    } finally {
      consoleLogSpy.mockRestore();
      await rm(workspacePath, { force: true, recursive: true });
    }
  });

  it('ignores non-critical fallback events', async () => {
    const emailFallbackModule = await loadOpsEventEmailFallbackModule();
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    try {
      await expect(
        emailFallbackModule.runOpsEventEmailFallback([
          '--event-line',
          '[HERMES_EVENT] {"schema":"screeps.ops.event.v1","id":"heartbeat-1","dedupeKey":"runtime_heartbeat:shard1","severity":"info","kind":"runtime_heartbeat","tick":1,"shard":"shard1","summary":"ok"}',
        ]),
      ).resolves.toMatchObject({
        fallback: 'ignored',
        reason: 'non-critical-event',
      });
    } finally {
      consoleLogSpy.mockRestore();
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

const isOpsEventEmailFallbackModule = (
  candidateModule: unknown,
): candidateModule is OpsEventEmailFallbackModule =>
  typeof candidateModule === 'object' &&
  candidateModule !== null &&
  'parseEmailFallbackArguments' in candidateModule &&
  typeof candidateModule.parseEmailFallbackArguments === 'function' &&
  'runOpsEventEmailFallback' in candidateModule &&
  typeof candidateModule.runOpsEventEmailFallback === 'function';
