/**
 * Environment-aware logging utility
 * Only logs in development, can be extended for production error tracking
 */

const isDevelopment = import.meta.env.DEV;

export const logger = {
  error: (...args: unknown[]) => {
    if (isDevelopment) {
      console.error(...args);
    }
    // In production, you could send to error tracking service
    // Example: Sentry.captureException(new Error(String(args[0])));
  },
  warn: (...args: unknown[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  info: (...args: unknown[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
  log: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
};

