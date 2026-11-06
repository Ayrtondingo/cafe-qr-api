import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { DatabaseHealthRepository } from './repositories/database-health.repository';
import { PrismaDatabaseHealthRepository } from './repositories/prisma-database-health.repository';

@Module({
  controllers: [HealthController],
  providers: [
    HealthService,
    { provide: DatabaseHealthRepository, useClass: PrismaDatabaseHealthRepository },
  ],
})
export class HealthModule {}
