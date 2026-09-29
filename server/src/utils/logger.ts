import { env, isProduction } from '../config/env.js';

type Level = 'debug' | 'info' | 'warn' | 'error';
type Meta = Record<string, unknown>;

const levelOrder: Record<Level | 'silent', number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

// Tests stay quiet; production skips debug noise.
const minLevel = env.NODE_ENV === 'test' ? 'silent' : isProduction ? 'info' : 'debug';

function serialize(meta: Meta): Meta {
  const out: Meta = {};
  for (const [key, value] of Object.entries(meta)) {
    out[key] =
      value instanceof Error
        ? { name: value.name, message: value.message, stack: value.stack }
        : value;
  }
  return out;
}

function write(level: Level, message: string, meta: Meta = {}) {
  if (levelOrder[level] < levelOrder[minLevel]) return;

  const stream = level === 'error' || level === 'warn' ? process.stderr : process.stdout;

  if (isProduction) {
    // One JSON object per line — ready for any log collector later.
    stream.write(
      `${JSON.stringify({ level, time: new Date().toISOString(), message, ...serialize(meta) })}\n`,
    );
    return;
  }

  const time = new Date().toLocaleTimeString('en-GB', { hour12: false });
  const { err, ...rest } = meta;
  const extras = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : '';
  stream.write(`${time} ${level.toUpperCase().padEnd(5)} ${message}${extras}\n`);
  if (err instanceof Error && err.stack) stream.write(`${err.stack}\n`);
}

/** Minimal structured logger: pretty in development, JSON lines in production, silent in tests. */
export const logger = {
  debug: (message: string, meta?: Meta) => write('debug', message, meta),
  info: (message: string, meta?: Meta) => write('info', message, meta),
  warn: (message: string, meta?: Meta) => write('warn', message, meta),
  error: (message: string, meta?: Meta) => write('error', message, meta),
};
