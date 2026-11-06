import { existsSync } from 'node:fs';
import { defineConfig } from 'prisma/config';

// Prisma 7 no carga .env automáticamente. En Docker/producción las variables
// llegan por el entorno; en desarrollo local se leen de .env.
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? '',
    // Base descartable para `prisma migrate dev` y `npm run db:check-drift`.
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL || undefined,
  },
});
