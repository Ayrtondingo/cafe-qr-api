import { Pool } from 'pg';

/**
 * Conexión directa a la base de test para probar las restricciones del modelo (CHECK, FK
 * compuestas, índices parciales, triggers) con SQL, sin pasar por la API.
 */
export function conectarBaseDeTest(): Pool {
  const url = process.env.DATABASE_URL ?? '';
  if (!/test/i.test(new URL(url).pathname)) {
    throw new Error('La base de los e2e debe contener "test" en el nombre');
  }
  return new Pool({ connectionString: url, max: 4 });
}

/**
 * Borra todos los datos entre tests. `pagos` rechaza TRUNCATE (trigger `pagos_sin_truncate`,
 * ADR 0004): se deshabilita solo dentro de esta transacción, así nunca queda apagado.
 */
export async function vaciarBase(pool: Pool): Promise<void> {
  const { rows } = await pool.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`,
  );
  if (rows.length === 0) return;
  const tablas = rows.map((row) => `"${row.tablename}"`).join(', ');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('ALTER TABLE "pagos" DISABLE TRIGGER "pagos_sin_truncate"');
    await client.query(`TRUNCATE ${tablas} RESTART IDENTITY CASCADE`);
    await client.query('ALTER TABLE "pagos" ENABLE TRIGGER "pagos_sin_truncate"');
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
