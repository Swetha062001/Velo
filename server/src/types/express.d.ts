declare global {
  namespace Express {
    interface Request {
      /** Unique id per request — returned as X-Request-Id and included in logs. */
      id: string;
    }
  }
}

export {};
