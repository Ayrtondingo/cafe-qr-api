import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { AppConfigService } from '../config/app-config.service';
import { PrismaClient } from '../generated/prisma/client';
import { DbClient, transactionStorage } from './transaction-context';

export interface PrismaTransactionOptions {
  timeout?: number;
}

/**
 * Envoltorio del cliente Prisma. Solo debe inyectarse en repositories y en
 * src/database (regla de arquitectura validada por ESLint).
 *
 * Usa composición en lugar de herencia: en Prisma 7 el constructor de
 * PrismaClient devuelve un Proxy y los getters de una subclase no ven los modelos.
 */
@Injectable()
export class PrismaService implements OnModuleDestroy {
  private readonly client: PrismaClient;

  constructor(config: AppConfigService) {
    this.client = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: config.databaseUrl,
        // Sesión en UTC: el adaptador envía las fechas sin zona horaria y PostgreSQL las
        // interpretaría con la zona del servidor (ej. Buenos Aires: +3 h de error).
        options: '-c TimeZone=UTC',
      }),
    });
  }

  /**
   * Cliente base, FUERA de cualquier transacción en curso. Solo para escrituras que deben
   * persistir aunque la operación se revierta (ej. registro de errores).
   */
  get base(): DbClient {
    return this.client;
  }

  /** Cliente a usar: el de la transacción en curso, o el base si no hay. */
  get db(): DbClient {
    return transactionStorage.getStore() ?? this.client;
  }

  $transaction<T>(
    work: (tx: DbClient) => Promise<T>,
    options?: PrismaTransactionOptions,
  ): Promise<T> {
    return this.client.$transaction(work, options);
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }
}
