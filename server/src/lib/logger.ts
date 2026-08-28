type Level = 'debug' | 'info' | 'warn' | 'error'

function log(level: Level, message: string, meta?: Record<string, unknown>) {
  const line = { level, message, time: new Date().toISOString(), ...meta }
  const method = level === 'debug' ? 'log' : level
  // eslint-disable-next-line no-console
  console[method as 'log' | 'info' | 'warn' | 'error'](JSON.stringify(line))
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => log('debug', message, meta),
  info: (message: string, meta?: Record<string, unknown>) => log('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => log('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => log('error', message, meta),
}
