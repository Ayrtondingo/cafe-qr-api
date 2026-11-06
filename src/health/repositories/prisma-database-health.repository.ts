import { Injectable, Logger } from '@nestjs/common';
import { PrismaRepository } from '../../database/prisma.repository';
import { DatabaseHealthRepository } from './database-health.repository';

@Injectable()
export class PrismaDatabaseHealthRepository
  extends PrismaRepository
  implements DatabaseHealthRepository
{
  private readonly logger = new Logger(PrismaDatabaseHealthRepository.name);

  async ping(): Promise<boolean> {
    try {
      await this.db.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      const reason = error instanceof Error ? error.message.replace(/\s+/g, ' ').trim() : error;
      this.logger.warn(`La base de datos no responde: ${String(reason)}`);
      return false;
    }
  }
}
