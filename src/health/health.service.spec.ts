import { HealthService } from './health.service';
import { DatabaseHealthRepository } from './repositories/database-health.repository';

describe('HealthService', () => {
  const repository: jest.Mocked<DatabaseHealthRepository> = { ping: jest.fn() };
  const service = new HealthService(repository);
  const now = new Date('2026-11-05T12:00:00.000Z');

  it('responde ok cuando la base de datos está disponible', async () => {
    repository.ping.mockResolvedValue(true);

    await expect(service.check(now)).resolves.toEqual({
      estado: 'ok',
      base: 'ok',
      version: '0.1.0',
      fecha: '2026-11-05T12:00:00.000Z',
    });
  });

  it('responde degradado cuando la base no responde', async () => {
    repository.ping.mockResolvedValue(false);

    await expect(service.check(now)).resolves.toMatchObject({
      estado: 'degradado',
      base: 'caida',
    });
  });
});
