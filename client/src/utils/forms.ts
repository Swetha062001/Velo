import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from '../lib/apiClient.ts';

interface ValidationDetail {
  path: string;
  message: string;
}

/**
 * Maps server validation errors (`details: [{ path: 'body.email', message }]`) onto form
 * fields. Returns true if at least one field error was applied.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: ReadonlyArray<Path<T>>,
): boolean {
  if (!(error instanceof ApiError) || !Array.isArray(error.details)) return false;

  let applied = false;
  for (const detail of error.details as ValidationDetail[]) {
    const field = detail.path?.replace(/^body\./, '') as Path<T>;
    if (fields.includes(field)) {
      setError(field, { type: 'server', message: detail.message });
      applied = true;
    }
  }
  return applied;
}

/** User-facing message for an unexpected mutation error. */
export function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';
}
