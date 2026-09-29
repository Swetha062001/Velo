import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api } from './apiClient.ts';

function stubFetch(impl: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const fetchMock = vi.fn(impl);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe('apiClient', () => {
  it('unwraps { data }, sends cookies and skips empty query params', async () => {
    const fetchMock = stubFetch(() => Response.json({ data: [1, 2] }));
    await expect(
      api.get('/products', { query: { q: 'run', color: '', page: 2 } }),
    ).resolves.toEqual([1, 2]);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe('http://api.test/api/v1/products?q=run&page=2');
    expect(init.credentials).toBe('include');
  });

  it('sends JSON bodies and returns meta when asked', async () => {
    const fetchMock = stubFetch(() => Response.json({ data: { ok: true }, meta: { merge: 1 } }));
    const res = await api.postWithMeta('/cart/merge', { items: [] });
    expect(res).toEqual({ data: { ok: true }, meta: { merge: 1 } });
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect(init.body).toBe('{"items":[]}');
  });

  it('turns the { error } envelope into a typed ApiError', async () => {
    stubFetch(() =>
      Response.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Bad', details: [{ path: 'body.email' }] } },
        { status: 400 },
      ),
    );
    const err = await api.post('/auth/login', {}).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 400, code: 'VALIDATION_ERROR', message: 'Bad' });
  });

  it('reports network failures as status 0', async () => {
    stubFetch(() => Promise.reject(new TypeError('Failed to fetch')));
    const err = (await api.get('/health').catch((e: unknown) => e)) as ApiError;
    expect(err.isNetworkError).toBe(true);
    expect(err.code).toBe('NETWORK_ERROR');
  });

  it('handles 204 No Content', async () => {
    stubFetch(() => new Response(null, { status: 204 }));
    await expect(api.delete('/wishlist/x')).resolves.toBeUndefined();
  });
});
