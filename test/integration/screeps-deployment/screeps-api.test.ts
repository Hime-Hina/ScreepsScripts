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
});
