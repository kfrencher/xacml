/**
 * Simple logging utility with configurable log levels
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

class Logger {
  constructor() {
    // Default to INFO level, can be overridden by environment variable
    this.level = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? LOG_LEVELS.INFO;
  }

  /**
   * Set the logging level
   * @param {'ERROR'|'WARN'|'INFO'|'DEBUG'} level 
   */
  setLevel(level) {
    this.level = LOG_LEVELS[level.toUpperCase()] ?? LOG_LEVELS.INFO;
  }

  /**
   * Log error messages (always shown)
   * @param {...any} args 
   */
  error(...args) {
    if (this.level >= LOG_LEVELS.ERROR) {
      console.error('[ERROR]', ...args);
    }
  }

  /**
   * Log warning messages
   * @param {...any} args 
   */
  warn(...args) {
    if (this.level >= LOG_LEVELS.WARN) {
      console.warn('[WARN]', ...args);
    }
  }

  /**
   * Log informational messages
   * @param {...any} args 
   */
  info(...args) {
    if (this.level >= LOG_LEVELS.INFO) {
      console.log('[INFO]', ...args);
    }
  }

  /**
   * Log debug messages (most verbose)
   * @param {...any} args 
   */
  debug(...args) {
    if (this.level >= LOG_LEVELS.DEBUG) {
      console.log('[DEBUG]', ...args);
    }
  }
}

// Export a singleton instance
const logger = new Logger();

export default logger;