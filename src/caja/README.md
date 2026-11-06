# Módulo caja

Pagos (inmutables, ADR 0004), turnos y arqueo, propinas y carga posterior de contingencia. Comprobantes ARCA: pospuestos hasta hablar con el contador. Tablas: `pagos`, `turnos_caja`.

Vacío por ahora: el código llega con su tarea de la etapa 1. Estructura (ADR 0003): `domain/` (reglas puras), `caja.service.ts` (casos de uso), `repositories/` (contrato + implementación Prisma), `caja.controller.ts` y `dto/` (HTTP).
