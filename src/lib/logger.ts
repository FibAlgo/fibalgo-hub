/**
 * Production-safe Logger
 * 
 * Automatically suppresses verbose logs in production while keeping critical errors.
 * Use this instead of console.log/warn/error throughout the codebase.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isProduction = process.env.NODE_ENV === 'production';

// In production, only show warnings and errors
const minLogLevel: LogLevel = isProduction ? 'warn' : 'debug';

const logLevels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel): boolean {
  return logLevels[level] >= logLevels[minLogLevel];
}

/**
 * Mask sensitive data before logging
 */
function maskSensitiveData(data: unknown): unknown {
  if (typeof data === 'string') {
    let result = data;
    
    // Mask emails
    result = result.replace(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi, (match) => {
      const [local, domain] = match.split('@');
      return `${local.substring(0, 2)}***@${domain}`;
    });
    
    // Mask UUIDs (user IDs)
    result = result.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, (match) => {
      return `${match.substring(0, 8)}...${match.substring(match.length - 4)}`;
    });
    
    // Mask JWT tokens
    result = result.replace(/eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, '[JWT_TOKEN]');
    
    // Mask API keys
    result = result.replace(/(sk-[a-zA-Z0-9]{20,})/g, '[API_KEY]');
    result = result.replace(/(Bearer\s+)[a-zA-Z0-9._-]+/gi, '$1[TOKEN]');
    
    return result;
  }
  
  return data;
}

function formatArgs(args: unknown[]): unknown[] {
  return args.map(maskSensitiveData);
}

export const logger = {
  /**
   * Debug logs - Only in development
   */
  debug: (...args: unknown[]) => {
    if (shouldLog('debug')) {
      console.log('[DEBUG]', ...formatArgs(args));
    }
  },

  /**
   * Info logs - Only in development
   */
  info: (...args: unknown[]) => {
    if (shouldLog('info')) {
      console.log('[INFO]', ...formatArgs(args));
    }
  },

  /**
   * Warning logs - Always shown
   */
  warn: (...args: unknown[]) => {
    if (shouldLog('warn')) {
      console.warn('[WARN]', ...formatArgs(args));
    }
  },

  /**
   * Error logs - Always shown (critical)
   */
  error: (...args: unknown[]) => {
    if (shouldLog('error')) {
      console.error('[ERROR]', ...formatArgs(args));
    }
  },

  /**
   * API request logging - Only in development, auto-masks sensitive data
   */
  api: (method: string, endpoint: string, details?: Record<string, unknown>) => {
    if (shouldLog('debug')) {
      const maskedDetails = details ? maskSensitiveData(JSON.stringify(details)) : '';
      console.log(`[API] ${method} ${endpoint}`, maskedDetails);
    }
  },

  /**
   * Webhook logging - Only warnings/errors in production
   */
  webhook: (event: string, details?: Record<string, unknown>) => {
    if (shouldLog('info')) {
      const maskedDetails = details ? maskSensitiveData(JSON.stringify(details)) : '';
      console.log(`[WEBHOOK] ${event}`, maskedDetails);
    }
  },

  /**
   * Security event logging - Always logged (important for audit)
   */
  security: (event: string, details?: Record<string, unknown>) => {
    const maskedDetails = details ? maskSensitiveData(JSON.stringify(details)) : '';
    console.warn(`[SECURITY] ${event}`, maskedDetails);
  },

  /**
   * Cron job logging - Only errors in production
   */
  cron: (job: string, message: string, isError = false) => {
    if (isError) {
      console.error(`[CRON:${job}] ${message}`);
    } else if (shouldLog('info')) {
      console.log(`[CRON:${job}] ${message}`);
    }
  },
};

export default logger;
