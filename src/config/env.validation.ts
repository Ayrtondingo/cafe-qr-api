import { plainToInstance, Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsNotEmpty, IsString, Max, Min, validateSync } from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export const LOG_LEVELS = ['error', 'warn', 'log', 'debug', 'verbose'] as const;
export type LogLevelName = (typeof LOG_LEVELS)[number];

/**
 * Variables de entorno de la etapa 1. Auth (JWT), archivos, ARCA y Mercado Pago se suman
 * con sus tareas, copiando la validación de Kiosco SaaS.
 */
export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT = 3000;

  @IsIn(LOG_LEVELS)
  LOG_LEVEL: LogLevelName = 'log';

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  CORS_ORIGINS = 'http://localhost:5173';

  /**
   * Proxies de confianza delante de la API (IP real del cliente). 1 = solo el Nginx del
   * frontend; 2 = además un proxy HTTPS adelante.
   */
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(5)
  TRUST_PROXY_HOPS = 1;
}

/** Reglas extra de producción: configuraciones que solo son válidas para desarrollo o tests. */
function assertProductionSafe(env: EnvironmentVariables): void {
  const origins = env.CORS_ORIGINS.split(',').map((origin) => origin.trim());
  if (origins.some((origin) => origin === '*' || origin === '')) {
    throw new Error(
      'Configuración de entorno inválida -> CORS_ORIGINS debe listar los orígenes exactos (sin "*")',
    );
  }
}

/**
 * Valida las variables de entorno al iniciar. Si falta algo obligatorio la aplicación no
 * arranca (fail fast).
 */
export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config);
  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    const details = errors
      .map((error) => `${error.property}: ${Object.values(error.constraints ?? {}).join(', ')}`)
      .join('; ');
    throw new Error(`Configuración de entorno inválida -> ${details}`);
  }
  if (validated.NODE_ENV === NodeEnv.Production) assertProductionSafe(validated);

  return validated;
}
