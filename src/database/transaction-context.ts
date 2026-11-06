import { AsyncLocalStorage } from 'node:async_hooks';
import type { Prisma } from '../generated/prisma/client';

/** Cliente de Prisma utilizable por repositories: base o transaccional. */
export type DbClient = Prisma.TransactionClient;

/**
 * Guarda el cliente transaccional activo para el flujo asíncrono actual,
 * de modo que los repositories lo tomen sin recibirlo por parámetro.
 */
export const transactionStorage = new AsyncLocalStorage<DbClient>();
