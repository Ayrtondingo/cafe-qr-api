/**
 * Contrato de transacciones para la capa de Services.
 *
 * Los services NO conocen Prisma: piden ejecutar un bloque de trabajo de forma
 * atómica y todos los repositories invocados dentro del bloque participan de
 * la misma transacción. Si el bloque lanza, se hace rollback completo.
 *
 * @example
 * await this.transactions.run(async () => {
 *   const pago = await this.pagos.registrar(localId, datos);
 *   await this.sesiones.cerrar(localId, sesionId);
 *   // ... (todo en la misma transacción)
 *   return pago;
 * });
 */
export interface TransactionOptions {
  /** Tiempo máximo de la transacción (solo operaciones masivas, ej. importaciones). */
  timeoutMs?: number;
}

export abstract class TransactionManager {
  abstract run<T>(work: () => Promise<T>, options?: TransactionOptions): Promise<T>;
}
