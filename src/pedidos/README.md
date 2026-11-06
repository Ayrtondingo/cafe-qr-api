# Módulo pedidos

Pedidos, ítems y opciones elegidas, estados, cola de barra e idempotencia del envío. Tablas: `pedidos`, `pedido_items`, `pedido_item_opciones`.

Vacío por ahora: el código llega con su tarea de la etapa 1. Estructura (ADR 0003): `domain/` (reglas puras), `pedidos.service.ts` (casos de uso), `repositories/` (contrato + implementación Prisma), `pedidos.controller.ts` y `dto/` (HTTP).
