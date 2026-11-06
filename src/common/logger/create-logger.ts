import { ConsoleLogger, LogLevel } from '@nestjs/common';
import { LOG_LEVELS, LogLevelName } from '../../config/env.validation';

/**
 * Logger de la aplicación. En producción emite JSON (una línea por evento), listo para
 * agregadores de logs; en desarrollo, salida legible con colores.
 */
export function createLogger(options: { level: LogLevelName; json: boolean }): ConsoleLogger {
  const maxIndex = LOG_LEVELS.indexOf(options.level);
  const logLevels: LogLevel[] = ['fatal', ...LOG_LEVELS.slice(0, maxIndex + 1)];

  return new ConsoleLogger({
    prefix: 'CafeQrAPI',
    logLevels,
    json: options.json,
    colors: !options.json,
  });
}
