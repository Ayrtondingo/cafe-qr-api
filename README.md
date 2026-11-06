# cafe-qr-api

API del sistema para café: pedidos por QR y club de puntos. NestJS 11 + Prisma 7 + PostgreSQL 18.

## Requisitos

- Node 24 (ver `.nvmrc`)
- Docker (para PostgreSQL)

## Puesta en marcha

```bash
cp .env.example .env
cp .env.test.example .env.test
npm install
npm run db:up            # PostgreSQL de desarrollo (5432) y de tests (5433)
npm run prisma:deploy    # aplica las migraciones
npm run start:dev        # http://localhost:3000/api/v1/health
```

## Tests

```bash
npm test                 # unitarios
npm run test:e2e         # contra PostgreSQL real (base cafe_qr_test)
npm run db:check-drift   # migraciones = schema.prisma
```

La especificación, el contrato con la web y los ADR están en el repo `cafe-qr` (`docs/`).
