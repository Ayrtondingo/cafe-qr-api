import { VersioningType } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { REQUEST_ID_HEADER } from './common/middleware/request-id.middleware';
import { AppConfigService } from './config/app-config.service';

export const API_PREFIX = 'api';

/**
 * Configuración HTTP común a main.ts y a los tests e2e, para que los tests ejerciten
 * exactamente la misma aplicación que corre en producción.
 */
export function configureApp(app: NestExpressApplication): void {
  const config = app.get(AppConfigService);

  // Detrás de Nginx (y quizás de un proxy HTTPS): IP real del cliente.
  app.set('trust proxy', config.trustProxyHops);
  app.disable('x-powered-by');

  app.use(helmet());
  app.useBodyParser('json', { limit: '1mb' });
  app.enableCors({
    origin: config.corsOrigins,
    credentials: true,
    exposedHeaders: [REQUEST_ID_HEADER],
  });

  // Las respuestas de la API tienen datos del local: ningún navegador ni proxy las guarda.
  app.use((_request: Request, response: Response, next: NextFunction) => {
    response.setHeader('Cache-Control', 'no-store');
    next();
  });

  app.setGlobalPrefix(API_PREFIX);
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.enableShutdownHooks();
}
