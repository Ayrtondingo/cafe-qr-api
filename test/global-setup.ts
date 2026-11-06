import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/** Aplica las migraciones en la base de test antes de correr los E2E. */
export default function globalSetup(): void {
  const root = join(__dirname, '..');
  const envFile = join(root, '.env.test');
  if (existsSync(envFile)) process.loadEnvFile(envFile);

  const url = process.env.DATABASE_URL ?? '';
  // Salvaguarda: los E2E borran datos. Nunca correrlos contra una base que no sea de test.
  if (!/test/i.test(new URL(url).pathname)) {
    throw new Error(
      `Los E2E requieren una base de datos de test (el nombre debe contener "test"). DATABASE_URL apunta a "${new URL(url).pathname}". Copiá .env.test.example a .env.test.`,
    );
  }

  execSync('npx prisma migrate deploy', { cwd: root, stdio: 'inherit', env: process.env });
}
