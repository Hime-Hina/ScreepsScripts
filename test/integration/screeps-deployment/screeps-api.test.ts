import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  loadPtrApiModule,
  loadScreepsApiModule,
  type PtrScreepsConfig,
  type ScreepsConfig,
} from '../../support/screeps-deployment-modules';

const screepsConfig: ScreepsConfig = {
  branch: 'main',
  protocol: 'http',
  server: '127.0.0.1:21025',
  token: 'secret-token',
};

const ptrConfig: PtrScreepsConfig = {
  branch: 'main',
  token: 'ptr-secret-token',
};

describe('Screeps API deployment boundary', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads remote modules with X-Token authentication and branch query', async () => {
    let capturedUrl = '';
    let capturedInit: RequestInit | undefined;

    vi.stubGlobal('fetch', (requestInput: string | URL, requestInit?: RequestInit) => {
      capturedUrl = requestInput.toString();
      capturedInit = requestInit;

      return Promise.resolve(
        new Response(JSON.stringify({ ok: 1, modules: { main: 'remote-main' } }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }),
      );
    });

    const screepsApiModule = await loadScreepsApiModule();

    await expect(screepsApiModule.readRemoteModuleSet(screepsConfig)).resolves.toEqual({
      main: 'remote-main',
    });
    expect(capturedUrl).toBe('http://127.0.0.1:21025/api/user/code?branch=main');
    expect(capturedInit?.headers).toEqual({
      'X-Token': 'secret-token',
    });
  });

  it('reads live account identity from auth/me with X-Token authentication', async () => {
    let capturedUrl = '';
    let capturedInit: RequestInit | undefined;

    vi.stubGlobal('fetch', (requestInput: string | URL, requestInit?: RequestInit) => {
      capturedUrl = requestInput.toString();
      capturedInit = requestInit;

      return Promise.resolve(
        new Response(JSON.stringify({ _id: 'alice-user', ok: 1, username: 'Alice' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }),
      );
    });

    const screepsApiModule = await loadScreepsApiModule();

    await expect(screepsApiModule.readLiveAccountIdentity(screepsConfig)).resolves.toEqual({
      accountId: 'alice-user',
      username: 'Alice',
    });
    expect(capturedUrl).toBe('http://127.0.0.1:21025/api/auth/me');
    expect(capturedUrl).not.toContain('secret-token');
    expect(capturedInit?.headers).toEqual({
      'X-Token': 'secret-token',
    });
  });

  it('reads live owned rooms from overview with X-Token authentication', async () => {
    let capturedUrl = '';
    let capturedInit: RequestInit | undefined;

    vi.stubGlobal('fetch', (requestInput: string | URL, requestInit?: RequestInit) => {
      capturedUrl = requestInput.toString();
      capturedInit = requestInit;

      return Promise.resolve(
        new Response(
          JSON.stringify({
            ok: 1,
            shard1: {
              rooms: ['W51N21'],
            },
            shard3: {
              rooms: ['W15S27'],
            },
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
          },
        ),
      );
    });

    const screepsApiModule = await loadScreepsApiModule();

    await expect(screepsApiModule.readLiveOwnedRooms(screepsConfig)).resolves.toEqual([
      {
        roomName: 'W51N21',
        shardName: 'shard1',
      },
      {
        roomName: 'W15S27',
        shardName: 'shard3',
      },
    ]);
    expect(capturedUrl).toBe('http://127.0.0.1:21025/api/user/overview?interval=8');
    expect(capturedUrl).not.toContain('secret-token');
    expect(capturedInit?.headers).toEqual({
      'X-Token': 'secret-token',
    });
  });

  it('rejects live account identity payloads without an account id', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.resolve(
        new Response(JSON.stringify({ ok: 1, username: 'Alice' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }),
      ),
    );

    const screepsApiModule = await loadScreepsApiModule();

    await expect(screepsApiModule.readLiveAccountIdentity(screepsConfig)).rejects.toThrow(
      'Screeps API auth/me response did not include account id.',
    );
  });

  it('uploads a complete branch module set without putting the token in the URL', async () => {
    let capturedUrl = '';
    let capturedInit: RequestInit | undefined;
    let fetchCallCount = 0;

    vi.stubGlobal('fetch', (requestInput: string | URL, requestInit?: RequestInit) => {
      fetchCallCount += 1;
      capturedUrl = requestInput.toString();
      capturedInit = requestInit;

      return Promise.resolve(
        new Response(JSON.stringify({ ok: 1 }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }),
      );
    });

    const screepsApiModule = await loadScreepsApiModule();

    await screepsApiModule.uploadRemoteModuleSet(screepsConfig, {
      main: 'local-main',
    });

    expect(capturedUrl).toBe('http://127.0.0.1:21025/api/user/code');
    expect(capturedInit?.headers).toEqual({
      'Content-Type': 'application/json; charset=utf-8',
      'X-Token': 'secret-token',
    });
    expect(capturedInit?.method).toBe('POST');
    expect(capturedInit?.body).toBe(
      JSON.stringify({ branch: 'main', modules: { main: 'local-main' } }),
    );
    expect(fetchCallCount).toBe(1);
  });

  it('reads room objects through the shard and room query with X-Token authentication', async () => {
    let capturedUrl = '';
    let capturedInit: RequestInit | undefined;

    vi.stubGlobal('fetch', (requestInput: string | URL, requestInit?: RequestInit) => {
      capturedUrl = requestInput.toString();
      capturedInit = requestInit;

      return Promise.resolve(
        new Response(
          JSON.stringify({
            objects: [
              {
                type: 'source',
                x: 12,
                y: 18,
              },
            ],
            ok: 1,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
          },
        ),
      );
    });

    const screepsApiModule = await loadScreepsApiModule();

    await expect(
      screepsApiModule.readRoomObjects(screepsConfig, 'shard3', 'W13S27'),
    ).resolves.toEqual([
      {
        type: 'source',
        x: 12,
        y: 18,
      },
    ]);
    expect(capturedUrl).toBe(
      'http://127.0.0.1:21025/api/game/room-objects?room=W13S27&shard=shard3',
    );
    expect(capturedInit?.headers).toEqual({
      'X-Token': 'secret-token',
    });
  });

  it('reads room status without logging credential material', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.resolve(
        new Response(JSON.stringify({ ok: 1, room: { status: 'normal' } }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }),
      ),
    );

    const screepsApiModule = await loadScreepsApiModule();

    await expect(screepsApiModule.readRoomStatus(screepsConfig, 'shard3', 'W13S27')).resolves.toBe(
      'normal',
    );
  });

  it('decodes missing room status as unknown for map areas outside visible room records', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.resolve(
        new Response(JSON.stringify({ ok: 1, room: null }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }),
      ),
    );

    const screepsApiModule = await loadScreepsApiModule();

    await expect(screepsApiModule.readRoomStatus(screepsConfig, 'shard1', 'W106S41')).resolves.toBe(
      'unknown',
    );
  });

  it('retries transient read failures before decoding a room response', async () => {
    let fetchCallCount = 0;

    vi.stubGlobal('fetch', () => {
      fetchCallCount += 1;

      if (fetchCallCount === 1) {
        return Promise.reject(new TypeError('fetch failed'));
      }

      return Promise.resolve(
        new Response(JSON.stringify({ ok: 1, room: { status: 'normal' } }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }),
      );
    });

    const screepsApiModule = await loadScreepsApiModule();

    await expect(screepsApiModule.readRoomStatus(screepsConfig, 'shard3', 'W13S27')).resolves.toBe(
      'normal',
    );
    expect(fetchCallCount).toBe(2);
  });

  it('reads the requested room terrain string from the terrain endpoint', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            ok: 1,
            terrain: [
              {
                room: 'W13S27',
                terrain: '0'.repeat(2500),
              },
            ],
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
          },
        ),
      ),
    );

    const screepsApiModule = await loadScreepsApiModule();

    await expect(
      screepsApiModule.readRoomTerrainText(screepsConfig, 'shard3', 'W13S27'),
    ).resolves.toBe('0'.repeat(2500));
  });

  it('reads top-level room terrain strings returned by the live terrain endpoint', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.resolve(
        new Response(JSON.stringify({ ok: 1, terrain: '2'.repeat(2500) }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }),
      ),
    );

    const screepsApiModule = await loadScreepsApiModule();

    await expect(
      screepsApiModule.readRoomTerrainText(screepsConfig, 'shard3', 'W18S26'),
    ).resolves.toBe('2'.repeat(2500));
  });

  it('decodes sparse terrain arrays returned by the live terrain endpoint', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            ok: 1,
            terrain: [
              { room: 'W18S26', type: 'wall', x: 1, y: 2 },
              { room: 'W18S26', type: 'swamp', x: 3, y: 4 },
              { room: 'W18S25', type: 'swamp', x: 5, y: 6 },
            ],
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
          },
        ),
      ),
    );

    const screepsApiModule = await loadScreepsApiModule();
    const terrainText = await screepsApiModule.readRoomTerrainText(
      screepsConfig,
      'shard3',
      'W18S26',
    );

    expect(terrainText).toHaveLength(2500);
    expect(terrainText[2 * 50 + 1]).toBe('1');
    expect(terrainText[4 * 50 + 3]).toBe('2');
    expect(terrainText[6 * 50 + 5]).toBe('0');
  });

  it('rejects non-JSON API responses', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.resolve(
        new Response('not-json', {
          status: 200,
        }),
      ),
    );

    const screepsApiModule = await loadScreepsApiModule();

    await expect(screepsApiModule.readRemoteModuleSet(screepsConfig)).rejects.toThrow(
      'Screeps API returned non-JSON response with HTTP 200.',
    );
  });

  it('rejects HTTP failures without logging response bodies', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.resolve(
        new Response(JSON.stringify({ ok: 0, error: 'bad token' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 401,
        }),
      ),
    );

    const screepsApiModule = await loadScreepsApiModule();

    await expect(screepsApiModule.readRemoteModuleSet(screepsConfig)).rejects.toThrow(
      'Screeps API request failed with HTTP 401.',
    );
  });

  it('rejects API payloads without ok=1 or modules', async () => {
    const screepsApiModule = await loadScreepsApiModule();

    vi.stubGlobal('fetch', () =>
      Promise.resolve(
        new Response(JSON.stringify({ ok: 0 }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }),
      ),
    );

    await expect(screepsApiModule.readRemoteModuleSet(screepsConfig)).rejects.toThrow(
      'Screeps API response did not include ok=1.',
    );

    vi.stubGlobal('fetch', () =>
      Promise.resolve(
        new Response(JSON.stringify({ ok: 1 }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }),
      ),
    );

    await expect(screepsApiModule.readRemoteModuleSet(screepsConfig)).rejects.toThrow(
      'Screeps API code response did not include modules.',
    );
  });
});

describe('Screeps PTR API deployment boundary', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads PTR remote modules from the fixed PTR API base with X-Token authentication', async () => {
    let capturedUrl = '';
    let capturedInit: RequestInit | undefined;

    vi.stubGlobal('fetch', (requestInput: string | URL, requestInit?: RequestInit) => {
      capturedUrl = requestInput.toString();
      capturedInit = requestInit;

      return Promise.resolve(
        new Response(JSON.stringify({ ok: 1, modules: { main: 'ptr-main' } }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }),
      );
    });

    const ptrApiModule = await loadPtrApiModule();

    await expect(ptrApiModule.readPtrRemoteModuleSet(ptrConfig)).resolves.toEqual({
      main: 'ptr-main',
    });
    expect(capturedUrl).toBe('https://screeps.com/ptr/api/user/code?branch=main');
    expect(capturedInit?.headers).toEqual({
      'X-Token': 'ptr-secret-token',
    });
  });

  it('uploads PTR module sets to the fixed PTR API base without putting token in the URL', async () => {
    let capturedUrl = '';
    let capturedInit: RequestInit | undefined;

    vi.stubGlobal('fetch', (requestInput: string | URL, requestInit?: RequestInit) => {
      capturedUrl = requestInput.toString();
      capturedInit = requestInit;

      return Promise.resolve(
        new Response(JSON.stringify({ ok: 1 }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }),
      );
    });

    const ptrApiModule = await loadPtrApiModule();

    await ptrApiModule.uploadPtrRemoteModuleSet(ptrConfig, {
      main: 'local-main',
    });

    expect(capturedUrl).toBe('https://screeps.com/ptr/api/user/code');
    expect(capturedUrl).not.toContain('ptr-secret-token');
    expect(capturedInit?.headers).toEqual({
      'Content-Type': 'application/json; charset=utf-8',
      'X-Token': 'ptr-secret-token',
    });
    expect(capturedInit?.method).toBe('POST');
    expect(capturedInit?.body).toBe(
      JSON.stringify({ branch: 'main', modules: { main: 'local-main' } }),
    );
  });

  it('reads PTR account, overview, and shard state through fixed PTR endpoints', async () => {
    const capturedUrls: string[] = [];
    const capturedHeaders: (RequestInit['headers'] | undefined)[] = [];
    const apiPayloads = [
      {
        cpu: 80,
        cpuShard: { shard1: 20 },
        ok: 1,
        username: 'Dragon_King',
      },
      {
        ok: 1,
        shard1: {
          gametime: 71630000,
          rooms: [],
        },
      },
      {
        ok: 1,
        shards: [{ cpuLimit: 20, name: 'shard1' }],
      },
    ];

    vi.stubGlobal('fetch', (requestInput: string | URL, requestInit?: RequestInit) => {
      capturedUrls.push(requestInput.toString());
      capturedHeaders.push(requestInit?.headers);

      return Promise.resolve(
        new Response(JSON.stringify(apiPayloads[capturedUrls.length - 1]), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }),
      );
    });

    const ptrApiModule = await loadPtrApiModule();

    await expect(ptrApiModule.readPtrAccountStatus(ptrConfig)).resolves.toMatchObject({
      cpu: 80,
      username: 'Dragon_King',
    });
    await expect(ptrApiModule.readPtrOverview(ptrConfig)).resolves.toMatchObject({
      shard1: {
        rooms: [],
      },
    });
    await expect(ptrApiModule.readPtrShardInfo(ptrConfig)).resolves.toMatchObject({
      shards: [{ cpuLimit: 20, name: 'shard1' }],
    });
    expect(capturedUrls).toEqual([
      'https://screeps.com/ptr/api/auth/me',
      'https://screeps.com/ptr/api/user/overview?interval=8',
      'https://screeps.com/ptr/api/game/shards/info',
    ]);
    expect(capturedHeaders).toEqual([
      { 'X-Token': 'ptr-secret-token' },
      { 'X-Token': 'ptr-secret-token' },
      { 'X-Token': 'ptr-secret-token' },
    ]);
  });

  it('reads PTR room status and room objects through shard and room query parameters', async () => {
    const capturedUrls: string[] = [];
    const apiPayloads = [
      {
        ok: 1,
        room: { status: 'normal' },
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
    ];

    vi.stubGlobal('fetch', (requestInput: string | URL, requestInit?: RequestInit) => {
      capturedUrls.push(requestInput.toString());
      expect(requestInit?.headers).toEqual({
        'X-Token': 'ptr-secret-token',
      });

      return Promise.resolve(
        new Response(JSON.stringify(apiPayloads[capturedUrls.length - 1]), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }),
      );
    });

    const ptrApiModule = await loadPtrApiModule();

    await expect(ptrApiModule.readPtrRoomStatus(ptrConfig, 'shard1', 'W51N21')).resolves.toBe(
      'normal',
    );
    await expect(ptrApiModule.readPtrRoomObjects(ptrConfig, 'shard1', 'W51N21')).resolves.toEqual([
      {
        name: 'Spawn1',
        type: 'spawn',
        x: 35,
        y: 23,
      },
    ]);
    expect(capturedUrls).toEqual([
      'https://screeps.com/ptr/api/game/room-status?room=W51N21&shard=shard1',
      'https://screeps.com/ptr/api/game/room-objects?room=W51N21&shard=shard1',
    ]);
  });

  it('places a PTR spawn with an explicit room founding request body', async () => {
    let capturedUrl = '';
    let capturedInit: RequestInit | undefined;

    vi.stubGlobal('fetch', (requestInput: string | URL, requestInit?: RequestInit) => {
      capturedUrl = requestInput.toString();
      capturedInit = requestInit;

      return Promise.resolve(
        new Response(JSON.stringify({ newbie: true, ok: 1 }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }),
      );
    });

    const ptrApiModule = await loadPtrApiModule();

    await expect(
      ptrApiModule.placePtrSpawn(ptrConfig, {
        roomName: 'W51N21',
        shardName: 'shard1',
        spawnName: 'Spawn1',
        x: 35,
        y: 23,
      }),
    ).resolves.toEqual({ newbie: true });
    expect(capturedUrl).toBe('https://screeps.com/ptr/api/game/place-spawn');
    expect(capturedUrl).not.toContain('ptr-secret-token');
    expect(capturedInit?.headers).toEqual({
      'Content-Type': 'application/json; charset=utf-8',
      'X-Token': 'ptr-secret-token',
    });
    expect(capturedInit?.method).toBe('POST');
    expect(capturedInit?.body).toBe(
      JSON.stringify({ room: 'W51N21', shard: 'shard1', x: 35, y: 23, name: 'Spawn1' }),
    );
  });
});
