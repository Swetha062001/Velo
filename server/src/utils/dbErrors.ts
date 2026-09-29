import { AppError } from './AppError.js';

interface PgError {
  code?: string;
  constraint?: string;
}

/**
 * Translates PostgreSQL constraint violations into client-safe AppErrors. The database is the
 * final guard (unique slugs/SKUs, price rules); this keeps its errors from becoming 500s.
 * `messages` maps constraint names to friendly text; unknown constraints get a generic message.
 */
export function mapConstraintError(err: unknown, messages: Record<string, string> = {}): never {
  const { code, constraint = '' } = (err ?? {}) as PgError;

  if (code === '23505') {
    throw AppError.conflict(messages[constraint] ?? 'This value is already in use');
  }
  if (code === '23514' || code === '23502') {
    throw AppError.badRequest(messages[constraint] ?? 'Some values are not allowed');
  }
  if (code === '23503') {
    throw AppError.conflict(messages[constraint] ?? 'This record is still in use');
  }
  throw err;
}
