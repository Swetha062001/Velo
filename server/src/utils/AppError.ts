/**
 * Expected, client-safe error. Anything thrown that is NOT an AppError
 * is treated as an unexpected 500 and its details are never sent to the client.
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }

  static badRequest(message = 'Bad request', details?: unknown) {
    return new AppError(400, 'BAD_REQUEST', message, details);
  }

  static validation(details: Array<{ path: string; message: string }>) {
    return new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', details);
  }

  static unauthorized(message = 'Authentication required') {
    return new AppError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = 'You do not have permission to perform this action') {
    return new AppError(403, 'FORBIDDEN', message);
  }

  static notFound(message = 'Resource not found') {
    return new AppError(404, 'NOT_FOUND', message);
  }

  static conflict(message: string, details?: unknown) {
    return new AppError(409, 'CONFLICT', message, details);
  }

  static tooManyRequests(message = 'Too many requests, please try again later') {
    return new AppError(429, 'RATE_LIMITED', message);
  }
}
