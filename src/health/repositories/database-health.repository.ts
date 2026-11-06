/**
 * Contrato del repository. Los services dependen de esta clase abstracta (usada como token de
 * inyección), nunca de la implementación Prisma.
 */
export abstract class DatabaseHealthRepository {
  /** Devuelve true si la base de datos responde. */
  abstract ping(): Promise<boolean>;
}
