'use client';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  source: string;
  message: string;
  data?: unknown;
}

const LOG_COLORS: Record<LogLevel, string> = {
  debug: '#888',
  info: '#4a9eff',
  warn: '#ffaa00',
  error: '#ff4a4a',
};

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Store recent logs for debug panel
const logBuffer: LogEntry[] = [];
const MAX_LOG_BUFFER = 100;

// Minimum log level based on environment
const MIN_LEVEL: LogLevel = process.env.NODE_ENV === 'production' ? 'warn' : 'debug';

function formatTimestamp(): string {
  const now = new Date();
  return now.toISOString().slice(11, 23);
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LEVEL];
}

function addToBuffer(entry: LogEntry): void {
  logBuffer.push(entry);
  if (logBuffer.length > MAX_LOG_BUFFER) {
    logBuffer.shift();
  }
}

function createLogger(source: string) {
  const log = (level: LogLevel, message: string, data?: unknown): void => {
    const entry: LogEntry = {
      timestamp: formatTimestamp(),
      level,
      source,
      message,
      data,
    };

    addToBuffer(entry);

    if (!shouldLog(level)) return;

    const prefix = `%c[${entry.timestamp}] [${source}]`;
    const style = `color: ${LOG_COLORS[level]}; font-weight: ${level === 'error' ? 'bold' : 'normal'}`;

    if (data !== undefined) {
      console[level](prefix, style, message, data);
    } else {
      console[level](prefix, style, message);
    }
  };

  return {
    debug: (message: string, data?: unknown) => log('debug', message, data),
    info: (message: string, data?: unknown) => log('info', message, data),
    warn: (message: string, data?: unknown) => log('warn', message, data),
    error: (message: string, data?: unknown) => log('error', message, data),
  };
}

// Get all buffered logs
export function getLogBuffer(): LogEntry[] {
  return [...logBuffer];
}

// Clear log buffer
export function clearLogBuffer(): void {
  logBuffer.length = 0;
}

// Copy logs to clipboard as formatted text
export function copyLogsToClipboard(): Promise<void> {
  const text = logBuffer
    .map((entry) => {
      const base = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.source}] ${entry.message}`;
      if (entry.data !== undefined) {
        return `${base}\n  Data: ${JSON.stringify(entry.data, null, 2)}`;
      }
      return base;
    })
    .join('\n');

  return navigator.clipboard.writeText(text);
}

// Pre-configured loggers for common sources
export const logger = {
  globe: createLogger('Globe'),
  cetus: createLogger('Cetus'),
  menu: createLogger('Menu'),
  app: createLogger('App'),
  create: createLogger,
};

export type { LogEntry, LogLevel };
