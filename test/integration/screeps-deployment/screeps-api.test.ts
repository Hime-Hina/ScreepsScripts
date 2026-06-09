import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadScreepsApiModule, type ScreepsConfig } from '../../support/screeps-deployment-modules';

const screepsConfig: ScreepsConfig = {
  branch: 'main',
  protocol: 'http',
  server: '127.0.0.1:21025',
  token: 'secret-token',
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
