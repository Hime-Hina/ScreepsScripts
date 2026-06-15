import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { describe, expect, it } from 'vitest';

interface ConsoleWebSocketModule {
  buildConsoleWebSocketUrl(screepsConfig: ScreepsConfig): URL;
  decodeSockJsFrame(frameText: string): { readonly messages: string[]; readonly type: string };
  openScreepsConsoleWebSocket(options: {
    readonly accountId: string;
    readonly onConsoleUpdate: (consoleUpdate: {
      readonly lines: string[];
      readonly shard: string;
    }) => void;
    readonly onDisconnect?: (reason: string) => void;
    readonly onError?: (error: Error) => void;
    readonly screepsConfig: ScreepsConfig;
    readonly WebSocketConstructor?: unknown;
  }): { readonly close: () => void };
  readConsoleUpdateMessage(
    messageText: string,
    accountId: string,
  ): { readonly lines: string[]; readonly shard: string } | null;
}

interface ScreepsConfig {
  readonly branch: string;
  readonly protocol: 'http' | 'https';
  readonly server: string;
  readonly token: string;
}

const SCREEPS_CONFIG: ScreepsConfig = {
  branch: 'main',
  protocol: 'https',
  server: 'screeps.com',
  token: 'secret-token',
};

const loadConsoleWebSocketModule = async (): Promise<ConsoleWebSocketModule> => {
  const loadedModule: unknown = await import(
    pathToFileURL(resolve('scripts/screeps/screeps-console-websocket.mjs')).href
  );

  if (!isConsoleWebSocketModule(loadedModule)) {
    throw new Error('screeps-console-websocket.mjs exports changed.');
  }

  return loadedModule;
};

describe('Screeps console websocket helpers', () => {
  it('builds SockJS websocket URLs without token material', async () => {
    const consoleWebSocketModule = await loadConsoleWebSocketModule();
    const socketUrl = consoleWebSocketModule.buildConsoleWebSocketUrl(SCREEPS_CONFIG);

    expect(socketUrl.toString()).toMatch(
      /^wss:\/\/screeps\.com\/socket\/\d+\/[a-z0-5]{8}\/websocket$/,
    );
    expect(socketUrl.toString()).not.toContain('secret-token');
  });

  it('decodes supported SockJS frame shapes and rejects malformed message arrays', async () => {
    const consoleWebSocketModule = await loadConsoleWebSocketModule();

    expect(consoleWebSocketModule.decodeSockJsFrame('o')).toEqual({ messages: [], type: 'open' });
    expect(consoleWebSocketModule.decodeSockJsFrame('h')).toEqual({
      messages: [],
      type: 'heartbeat',
    });
    expect(consoleWebSocketModule.decodeSockJsFrame(`a${JSON.stringify(['one', 'two'])}`)).toEqual({
      messages: ['one', 'two'],
      type: 'messages',
    });
    expect(consoleWebSocketModule.decodeSockJsFrame(`m${JSON.stringify('one')}`)).toEqual({
      messages: ['one'],
      type: 'messages',
    });
    expect(consoleWebSocketModule.decodeSockJsFrame('c[3000,"Go away"]')).toEqual({
      messages: [],
      type: 'close',
    });
    expect(consoleWebSocketModule.decodeSockJsFrame('x')).toEqual({
      messages: [],
      type: 'unknown',
    });
    expect(() => consoleWebSocketModule.decodeSockJsFrame(`a${JSON.stringify([1])}`)).toThrow(
      'SockJS message array did not contain only strings.',
    );
    expect(() => consoleWebSocketModule.decodeSockJsFrame(`m${JSON.stringify({})}`)).toThrow(
      'SockJS single message was not a string.',
    );
  });

  it('extracts console log updates and ignores unrelated websocket messages', async () => {
    const consoleWebSocketModule = await loadConsoleWebSocketModule();
    const consoleUpdateMessage = JSON.stringify([
      'user:alice-user/console',
      {
        messages: { log: ['line-1', 42, 'line-2'] },
        shard: 'shard1',
      },
    ]);

    expect(
      consoleWebSocketModule.readConsoleUpdateMessage(consoleUpdateMessage, 'alice-user'),
    ).toEqual({
      lines: ['line-1', 'line-2'],
      shard: 'shard1',
    });
    expect(consoleWebSocketModule.readConsoleUpdateMessage('not-json', 'alice-user')).toBeNull();
    expect(
      consoleWebSocketModule.readConsoleUpdateMessage(JSON.stringify(['only-one']), 'alice-user'),
    ).toBeNull();
    expect(
      consoleWebSocketModule.readConsoleUpdateMessage(
        JSON.stringify(['user:bob-user/console', { messages: { log: [] }, shard: 'shard1' }]),
        'alice-user',
      ),
    ).toBeNull();
    expect(
      consoleWebSocketModule.readConsoleUpdateMessage(
        JSON.stringify(['user:alice-user/console', { messages: {}, shard: 'shard1' }]),
        'alice-user',
      ),
    ).toBeNull();
  });

  it('authenticates, subscribes, emits console updates, and closes without leaking tokens', async () => {
    const consoleWebSocketModule = await loadConsoleWebSocketModule();
    const consoleUpdates: { readonly lines: string[]; readonly shard: string }[] = [];
    const socket = consoleWebSocketModule.openScreepsConsoleWebSocket({
      accountId: 'alice-user',
      onConsoleUpdate: (consoleUpdate) => consoleUpdates.push(consoleUpdate),
      screepsConfig: SCREEPS_CONFIG,
      WebSocketConstructor: MockConsoleWebSocket,
    });
    const socketInstance = readLatestMockSocket();

    socketInstance.emit('o');
    socketInstance.emit(`a${JSON.stringify(['auth ok'])}`);
    socketInstance.emit(
      `a${JSON.stringify([
        JSON.stringify([
          'user:alice-user/console',
          { messages: { log: ['[HERMES_EVENT] {}'] }, shard: 'shard1' },
        ]),
      ])}`,
    );
    socket.close();

    expect(socketInstance.url).not.toContain('secret-token');
    expect(socketInstance.sentMessages).toEqual([
      '["auth secret-token"]',
      '["subscribe user:alice-user/console"]',
    ]);
    expect(consoleUpdates).toEqual([{ lines: ['[HERMES_EVENT] {}'], shard: 'shard1' }]);
    expect(socketInstance.closeCount).toBe(1);
  });

  it('reports auth failure, malformed frames, and websocket disconnects', async () => {
    const consoleWebSocketModule = await loadConsoleWebSocketModule();
    const authErrors: string[] = [];
    const malformedErrors: string[] = [];
    const disconnects: string[] = [];

    const authSocket = consoleWebSocketModule.openScreepsConsoleWebSocket({
      accountId: 'alice-user',
      onConsoleUpdate: () => undefined,
      onError: (error) => authErrors.push(error.message),
      screepsConfig: SCREEPS_CONFIG,
      WebSocketConstructor: MockConsoleWebSocket,
    });
    readLatestMockSocket().emit(`a${JSON.stringify(['auth failed'])}`);
    authSocket.close();

    const malformedSocket = consoleWebSocketModule.openScreepsConsoleWebSocket({
      accountId: 'alice-user',
      onConsoleUpdate: () => undefined,
      onError: (error) => malformedErrors.push(error.message),
      screepsConfig: SCREEPS_CONFIG,
      WebSocketConstructor: MockConsoleWebSocket,
    });
    readLatestMockSocket().emit('a{bad-json');
    malformedSocket.close();

    const closeSocket = consoleWebSocketModule.openScreepsConsoleWebSocket({
      accountId: 'alice-user',
      onConsoleUpdate: () => undefined,
      onDisconnect: (reason) => disconnects.push(reason),
      screepsConfig: SCREEPS_CONFIG,
      WebSocketConstructor: MockConsoleWebSocket,
    });
    readLatestMockSocket().emit('c[3000,"Go away"]');
    closeSocket.close();

    const errorSocket = consoleWebSocketModule.openScreepsConsoleWebSocket({
      accountId: 'alice-user',
      onConsoleUpdate: () => undefined,
      onDisconnect: (reason) => disconnects.push(reason),
      screepsConfig: SCREEPS_CONFIG,
      WebSocketConstructor: MockConsoleWebSocket,
    });
    readLatestMockSocket().onerror?.();
    errorSocket.close();

    expect(authErrors).toEqual(['Screeps console websocket authentication failed.']);
    expect(malformedErrors.join('\n')).toContain(
      'Screeps console websocket returned malformed frame',
    );
    expect(malformedErrors.join('\n')).not.toContain('secret-token');
    expect(disconnects).toEqual(['sockjs-close-frame', 'websocket-error']);
  });

  it('fails before connecting when websocket support is unavailable or constructor fails', async () => {
    const consoleWebSocketModule = await loadConsoleWebSocketModule();

    expect(() =>
      consoleWebSocketModule.openScreepsConsoleWebSocket({
        accountId: 'alice-user',
        onConsoleUpdate: () => undefined,
        screepsConfig: SCREEPS_CONFIG,
        WebSocketConstructor: null,
      }),
    ).toThrow('WebSocket is not available in this Node runtime.');
    expect(() =>
      consoleWebSocketModule.openScreepsConsoleWebSocket({
        accountId: 'alice-user',
        onConsoleUpdate: () => undefined,
        screepsConfig: SCREEPS_CONFIG,
        WebSocketConstructor: ThrowingConsoleWebSocket,
      }),
    ).toThrow('Failed to open Screeps console websocket: constructor failed');
  });
});

class MockConsoleWebSocket {
  static instances: MockConsoleWebSocket[] = [];

  readonly sentMessages: string[] = [];
  readonly url: string;
  closeCount = 0;

  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((messageEvent: { readonly data: string }) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockConsoleWebSocket.instances.push(this);
  }

  close() {
    this.closeCount += 1;
  }

  emit(data: string) {
    this.onmessage?.({ data });
  }

  send(messageText: string) {
    this.sentMessages.push(messageText);
  }
}

const readLatestMockSocket = () => {
  const socketInstance = MockConsoleWebSocket.instances[MockConsoleWebSocket.instances.length - 1];

  if (socketInstance === undefined) {
    throw new Error('Expected mock websocket instance.');
  }

  return socketInstance;
};

class ThrowingConsoleWebSocket {
  constructor() {
    throw new Error('constructor failed');
  }
}

const isConsoleWebSocketModule = (
  candidateModule: unknown,
): candidateModule is ConsoleWebSocketModule =>
  typeof candidateModule === 'object' &&
  candidateModule !== null &&
  'buildConsoleWebSocketUrl' in candidateModule &&
  typeof candidateModule.buildConsoleWebSocketUrl === 'function' &&
  'decodeSockJsFrame' in candidateModule &&
  typeof candidateModule.decodeSockJsFrame === 'function' &&
  'openScreepsConsoleWebSocket' in candidateModule &&
  typeof candidateModule.openScreepsConsoleWebSocket === 'function' &&
  'readConsoleUpdateMessage' in candidateModule &&
  typeof candidateModule.readConsoleUpdateMessage === 'function';
