// [AI] Central Logger — standardized logging for all modules
// [AI] reading from .env.local for runtime config

export type LogLevel = 'info' | 'warn' | 'error' | 'critical';

export interface LogEntry {
  timestamp: string;
  module: string;
  action: string;
  user_id?: string;
  reference_id?: string;
  correlation_id?: string;
  payload?: unknown;
  severity: LogLevel;
  error?: unknown;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  info: 0,
  warn: 1,
  error: 2,
  critical: 3,
};

const currentLevel: LogLevel =
  (process.env.NEXT_PUBLIC_LOG_LEVEL as LogLevel) || 'info';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[currentLevel];
}

function formatLog(entry: LogEntry): string {
  const base = `[${entry.timestamp}] [${entry.severity.toUpperCase()}] [${entry.module}] ${entry.action}`;
  const extras: string[] = [];
  if (entry.correlation_id) extras.push(`correlation=${entry.correlation_id}`);
  if (entry.user_id) extras.push(`user=${entry.user_id}`);
  if (entry.reference_id) extras.push(`ref=${entry.reference_id}`);
  const meta = extras.length ? ` (${extras.join(', ')})` : '';
  return base + meta;
}

function writeLog(entry: LogEntry) {
  if (!shouldLog(entry.severity)) return;

  const message = formatLog(entry);

  switch (entry.severity) {
    case 'critical':
    case 'error':
      console.error(message, entry.payload || '');
      if (entry.error) console.error(entry.error);
      break;
    case 'warn':
      console.warn(message, entry.payload || '');
      break;
    case 'info':
    default:
      console.log(message, entry.payload || '');
      break;
  }
}

export function log(
  severity: LogLevel,
  module: string,
  action: string,
  opts?: {
    user_id?: string;
    reference_id?: string;
    correlation_id?: string;
    payload?: unknown;
    error?: unknown;
  }
) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    severity,
    module,
    action,
    user_id: opts?.user_id,
    reference_id: opts?.reference_id,
    correlation_id: opts?.correlation_id,
    payload: opts?.payload,
    error: opts?.error,
  };
  writeLog(entry);
}

export const logger = {
  info(module: string, action: string, opts?: Omit<LogEntry, 'timestamp' | 'severity' | 'module' | 'action'>) {
    log('info', module, action, opts);
  },
  warn(module: string, action: string, opts?: Omit<LogEntry, 'timestamp' | 'severity' | 'module' | 'action'>) {
    log('warn', module, action, opts);
  },
  error(module: string, action: string, opts?: Omit<LogEntry, 'timestamp' | 'severity' | 'module' | 'action'>) {
    log('error', module, action, opts);
  },
  critical(module: string, action: string, opts?: Omit<LogEntry, 'timestamp' | 'severity' | 'module' | 'action'>) {
    log('critical', module, action, opts);
  },
};
