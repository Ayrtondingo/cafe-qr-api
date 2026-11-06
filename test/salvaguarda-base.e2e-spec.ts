import globalSetup from './global-setup';
import { conectarBaseDeTest } from './utils/base-de-test';

/**
 * Los e2e borran todos los datos: nunca deben correr contra una base que no sea de test.
 * `process.loadEnvFile` no pisa variables ya definidas, así que acá se puede simular una
 * DATABASE_URL de producción sin llegar a ejecutar `prisma migrate deploy`.
 */
describe('Salvaguarda de la base de los e2e', () => {
  const original = process.env.DATABASE_URL;

  afterEach(() => {
    process.env.DATABASE_URL = original;
  });

  it('el global setup se niega a correr si la base no tiene "test" en el nombre', () => {
    process.env.DATABASE_URL = 'postgresql://cafe:cafe@localhost:5432/cafe_qr?schema=public';

    expect(() => globalSetup()).toThrow(/base de datos de test/);
  });

  it('no alcanza con que "test" aparezca en el host o el usuario', () => {
    process.env.DATABASE_URL = 'postgresql://test:test@test-host:5432/cafe_qr';

    expect(() => globalSetup()).toThrow(/base de datos de test/);
    expect(() => conectarBaseDeTest()).toThrow(/test/);
  });

  it('la conexión directa de los tests también se niega con una base que no es de test', () => {
    process.env.DATABASE_URL = 'postgresql://cafe:cafe@localhost:5432/cafe_qr';

    expect(() => conectarBaseDeTest()).toThrow(/test/);
  });
});
