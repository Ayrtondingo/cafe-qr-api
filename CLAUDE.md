# cafe-qr-api

Backend del sistema para café (NestJS 11 + Prisma 7 + PostgreSQL). Las reglas generales, la especificación y los ADR están en el repo padre `cafe-qr/` (`CLAUDE.md`, `docs/`).

## Scripts

| Script                                        | Qué hace                                                                                  |
| --------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `npm run db:up` / `db:down`                   | Levanta o baja PostgreSQL de desarrollo (5432) y de tests (5433)                          |
| `npm run start:dev`                           | API en http://localhost:3000/api/v1                                                       |
| `npm run typecheck` · `lint` · `format:check` | Tipos, ESLint, Prettier                                                                   |
| `npm test`                                    | Tests unitarios (`src/**/*.spec.ts`)                                                      |
| `npm run test:e2e`                            | Tests e2e contra PostgreSQL real (`test/**/*.e2e-spec.ts`); aplican las migraciones antes |
| `npm run prisma:migrate`                      | Crea una migración nueva (`--create-only` para editar el SQL antes de aplicarla)          |
| `npm run db:check-drift`                      | Falla si las migraciones no coinciden con `schema.prisma`                                 |
| `npm run build`                               | Compila a `dist/`                                                                         |

Antes de terminar una tarea corré `typecheck`, `lint`, `test`, `test:e2e`, `db:check-drift` y `build`.

## Estructura

- `src/config`, `src/database`, `src/common`: infraestructura copiada de Kiosco SaaS.
- `src/health`: único endpoint por ahora (`GET /api/v1/health`).
- `src/<modulo>/` (`carta`, `salon`, `pedidos`, `caja`, `tiempo-real`): capas según ADR 0003 (`domain/`, `*.service.ts`, `repositories/`, `*.controller.ts` + `dto/`).
- `prisma/schema.prisma` y `prisma/migrations/`.
- `test/`: e2e. `test/utils/base-de-test.ts` conecta a la base de test y la vacía entre casos.

## Reglas de este repo

- Prisma solo se importa desde `src/database/**` y `**/repositories/**` (ESLint).
- Montos: `Decimal(14,2)` en la base, centavos enteros en dominio y API. Convertir solo con `src/common/money`.
- El `local_id` sale del usuario autenticado o de la sesión de mesa, nunca del body: el `ValidationPipe` global rechaza propiedades desconocidas.
- CHECK y triggers van a mano al final del SQL de la migración y se anotan con `SQL:` en el modelo. Prisma no los compara: se testean contra PostgreSQL real.
- `pagos` es inmutable (triggers contra UPDATE, DELETE y TRUNCATE): se anula insertando un contramovimiento con `anula_a_id`. `vaciarBase` deshabilita el de TRUNCATE solo dentro de su transacción.
- Los e2e se niegan a correr si la base no tiene "test" en el nombre.
