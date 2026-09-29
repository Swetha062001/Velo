import type { Response } from 'express';

/**
 * Success responses always use the `{ data, meta? }` envelope.
 * (Errors use `{ error }` and are produced only by the central error handler.)
 */
export function ok<T>(res: Response, data: T, meta?: Record<string, unknown>) {
  res.status(200).json(meta ? { data, meta } : { data });
}

export function created<T>(res: Response, data: T) {
  res.status(201).json({ data });
}

export function noContent(res: Response) {
  res.status(204).end();
}
