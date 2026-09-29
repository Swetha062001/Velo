import { env } from '../config/env.ts';

/** Error shape mirrored from the server: `{ error: { code, message, details? } }`. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** True when the request never reached the server (offline, CORS, server down). */
  get isNetworkError() {
    return this.status === 0;
  }
}

type QueryValue = string | number | boolean | null | undefined;

interface RequestOptions {
  query?: Record<string, QueryValue>;
  body?: unknown;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: Record<string, QueryValue>) {
  const url = new URL(`${env.apiBaseUrl}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const { query, body, signal } = options;

  let res: Response;
  try {
    res = await fetch(buildUrl(path, query), {
      method,
      signal,
      credentials: 'include', // send the httpOnly auth cookie
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError(0, 'NETWORK_ERROR', 'Unable to reach the server. Please try again.');
  }

  if (res.status === 204) return undefined as T;

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    const error = payload?.error;
    throw new ApiError(
      res.status,
      error?.code ?? 'HTTP_ERROR',
      error?.message ?? `Request failed with status ${res.status}`,
      error?.details,
    );
  }

  return payload?.data as T;
}

export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'body'>) =>
    request<T>('GET', path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('POST', path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PATCH', path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PUT', path, { ...options, body }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>('DELETE', path, options),
};
