import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import type { DbClient } from './transaction-context';

/**
 * Base de las implementaciones Prisma de repositories.
 * `this.db` participa automáticamente de la transacción en curso.
 *
 * Regla multi-local: todo método de un repository de entidades del local
 * recibe `localId` explícito y lo incluye en el `where`.
 *
 * @Injectable es necesario para que Nest resuelva la dependencia del
 * constructor heredado en las subclases que no declaran el suyo.
 */
@Injectable()
export abstract class PrismaRepository {
  constructor(private readonly prisma: PrismaService) {}

  protected get db(): DbClient {
    return this.prisma.db;
  }
}
