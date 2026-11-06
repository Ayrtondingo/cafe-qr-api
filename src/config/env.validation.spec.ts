import { NodeEnv, validateEnv } from './env.validation';

describe('validateEnv', () => {
  const base = { DATABASE_URL: 'postgresql://u:p@localhost:5432/db' };

  it('aplica valores por defecto', () => {
    const env = validateEnv(base);

    expect(env.NODE_ENV).toBe(NodeEnv.Development);
    expect(env.PORT).toBe(3000);
    expect(env.TRUST_PROXY_HOPS).toBe(1);
  });

  it('convierte tipos desde strings', () => {
    expect(validateEnv({ ...base, PORT: '4000' }).PORT).toBe(4000);
  });

  it('falla si faltan variables obligatorias', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
  });

  it('falla con valores inválidos', () => {
    expect(() => validateEnv({ ...base, NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
    expect(() => validateEnv({ ...base, PORT: '99999' })).toThrow(/PORT/);
    expect(() => validateEnv({ ...base, LOG_LEVEL: 'todo' })).toThrow(/LOG_LEVEL/);
  });

  it('producción: rechaza CORS abierto', () => {
    const prod = { ...base, NODE_ENV: 'production', CORS_ORIGINS: 'https://cafe.com' };
    expect(validateEnv(prod).NODE_ENV).toBe(NodeEnv.Production);
    expect(() => validateEnv({ ...prod, CORS_ORIGINS: '*' })).toThrow(/CORS_ORIGINS/);
    // En desarrollo se permite.
    expect(validateEnv({ ...base, CORS_ORIGINS: '*' }).CORS_ORIGINS).toBe('*');
  });
});
