// src/utils/logger.ts
/* eslint-disable no-console */

type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';

const LogLevels: Record<LogLevel, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
};

// Check if we are running in development mode
const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

// Minimum log level allowed to print
const MIN_LEVEL: number = isDev ? LogLevels.trace : LogLevels.info;

const print = (level: LogLevel, message: string, ...args: any[]) => {
  if (LogLevels[level] < MIN_LEVEL) return;

  const timestamp = new Date().toISOString();
  const prefix = `[BillDesk] [${timestamp}] [${level.toUpperCase()}]:`;

  switch (level) {
    case 'trace':
    case 'debug':
      console.log(prefix, message, ...args);
      break;
    case 'info':
      console.info(prefix, message, ...args);
      break;
    case 'warn':
      console.warn(prefix, message, ...args);
      break;
    case 'error':
      console.error(prefix, message, ...args);
      break;
  }
};

export const Logger = {
  trace(message: string, ...args: any[]) {
    print('trace', message, ...args);
  },
  debug(message: string, ...args: any[]) {
    print('debug', message, ...args);
  },
  info(message: string, ...args: any[]) {
    print('info', message, ...args);
  },
  warn(message: string, ...args: any[]) {
    print('warn', message, ...args);
  },
  error(message: string, ...args: any[]) {
    print('error', message, ...args);
  },
};
