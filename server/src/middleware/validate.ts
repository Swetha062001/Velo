import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { AppError } from '../utils/AppError.js';

interface RequestSchemas {
  params?: ZodType;
  query?: ZodType;
  body?: ZodType;
}

/**
 * Validates and parses request input. Parsed values (with coercion and defaults
 * applied) replace the raw ones, so controllers only ever see validated data.
 * Type params/body with `Request<Params, unknown, Body>`; read the query with `validatedQuery()`
 * (Express's types can't express that `req.query` was replaced).
 *
 * All locations are validated together so the client gets every issue at once.
 */
export function validate(schemas: RequestSchemas): RequestHandler {
  return (req, _res, next) => {
    const issues: Array<{ path: string; message: string }> = [];
    const parsed: Partial<Record<keyof RequestSchemas, unknown>> = {};

    for (const location of ['params', 'query', 'body'] as const) {
      const schema = schemas[location];
      if (!schema) continue;

      const result = schema.safeParse(req[location] ?? {});
      if (result.success) {
        parsed[location] = result.data;
      } else {
        for (const issue of result.error.issues) {
          issues.push({ path: [location, ...issue.path].join('.'), message: issue.message });
        }
      }
    }

    if (issues.length > 0) {
      throw AppError.validation(issues);
    }

    if ('params' in parsed) req.params = parsed.params as typeof req.params;
    if ('body' in parsed) req.body = parsed.body;
    if ('query' in parsed) {
      // Express 5 exposes req.query as a getter; redefine it with the parsed value.
      Object.defineProperty(req, 'query', {
        value: parsed.query,
        writable: true,
        enumerable: true,
        configurable: true,
      });
    }

    next();
  };
}

/** The query parsed by `validate({ query })`, typed as the schema's output. */
export function validatedQuery<T>(req: { query: unknown }): T {
  return req.query as T;
}
