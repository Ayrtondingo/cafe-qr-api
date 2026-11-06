import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { createLogger } from './common/logger/create-logger';
import { AppConfigService } from './config/app-config.service';

async function bootstrap(): Promise<void> {
  const isProduction = process.env.NODE_ENV === 'production';
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    logger: createLogger({ level: 'log', json: isProduction }),
  });

  const config = app.get(AppConfigService);
  app.useLogger(createLogger({ level: config.logLevel, json: config.isProduction }));

  configureApp(app);

  await app.listen(config.port);

  new Logger('Bootstrap').log(
    `API escuchando en http://localhost:${config.port}/api/v1 (${config.nodeEnv})`,
  );
}

void bootstrap();
