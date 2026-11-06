# Módulo tiempo-real

Publica eventos en vivo después de confirmar la transacción. Nunca es la fuente de verdad: al reconectar, cada pantalla pide el estado completo. Sin tablas.

Vacío por ahora: el código llega con su tarea de la etapa 1. Estructura (ADR 0003): `domain/` (reglas puras), `tiempo-real.service.ts` (casos de uso), `repositories/` (contrato + implementación Prisma), `tiempo-real.controller.ts` y `dto/` (HTTP).
