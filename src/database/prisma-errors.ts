import { Prisma } from '../generated/prisma/client';

/** True si el error es una violación de unicidad (P2002) de Prisma. */
export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

/** True si el error es una violación de clave foránea (P2003) de Prisma. */
export function isForeignKeyViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003';
}
