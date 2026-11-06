import { existsSync } from 'node:fs';
import { join } from 'node:path';

// Los e2e usan una base de datos real y DEDICADA (ver .env.test.example).
const envFile = join(__dirname, '..', '.env.test');
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}
process.env.NODE_ENV = 'test';
