import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { DatabaseHealthRepository } from '../src/health/repositories/database-health.repository';

/**
 * E2E de la infraestructura HTTP: prefijo, versionado, formato de respuestas y de errores,
 * request ID y headers de seguridad. La base se reemplaza por un doble para que estos tests
 * no dependan del estado de PostgreSQL.
 */
describe('Infraestructura HTTP (e2e)', () => {
  let app: NestExpressApplication;
  const databaseHealth = { ping: jest.fn<Promise<boolean>, []>() };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DatabaseHealthRepository)
      .useValue(databaseHealth)
      .compile();

    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  it('GET /api/v1/health responde 200 con { data } cuando la base está disponible', async () => {
    databaseHealth.ping.mockResolvedValue(true);

    const response = await http().get('/api/v1/health').expect(200);

    expect(response.body).toEqual({
      data: {
        estado: 'ok',
        base: 'ok',
        version: expect.any(String) as string,
        fecha: expect.any(String) as string,
      },
    });
    expect(response.headers['x-request-id']).toEqual(expect.any(String));
  });

  it('GET /api/v1/health responde 503 con el mismo cuerpo cuando la base no responde', async () => {
    databaseHealth.ping.mockResolvedValue(false);

    const response = await http().get('/api/v1/health').expect(503);

    expect(response.body).toMatchObject({ data: { estado: 'degradado', base: 'caida' } });
  });

  it('agrega headers de seguridad y prohíbe cachear respuestas de la API', async () => {
    databaseHealth.ping.mockResolvedValue(true);

    const response = await http().get('/api/v1/health').expect(200);

    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('rutas inexistentes responden 404 con la forma de error del contrato', async () => {
    const response = await http().get('/api/v1/no-existe').expect(404);

    expect(response.body).toEqual({
      codigo: 'NO_ENCONTRADO',
      mensaje: expect.any(String) as string,
      detalles: null,
      ruta: '/api/v1/no-existe',
      fecha: expect.any(String) as string,
      requestId: expect.any(String) as string,
    });
  });

  it('un JSON mal formado es un error del cliente (400), no del servidor', async () => {
    const response = await http()
      .post('/api/v1/health')
      .set('Content-Type', 'application/json')
      .send('{"nota": ')
      .expect(400);

    expect(response.body).toMatchObject({ codigo: 'SOLICITUD_INVALIDA' });
  });

  it('respeta un x-request-id válido enviado por el proxy', async () => {
    databaseHealth.ping.mockResolvedValue(true);

    const response = await http()
      .get('/api/v1/health')
      .set('x-request-id', 'nginx-req-12345')
      .expect(200);

    expect(response.headers['x-request-id']).toBe('nginx-req-12345');
  });
});
