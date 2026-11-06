-- CreateEnum
CREATE TYPE "EstadoLocal" AS ENUM ('ACTIVO', 'SUSPENDIDO');

-- CreateEnum
CREATE TYPE "EstadoUsuario" AS ENUM ('ACTIVO', 'INACTIVO');

-- CreateEnum
CREATE TYPE "FormaMesa" AS ENUM ('REDONDA', 'CUADRADA', 'LARGA');

-- CreateEnum
CREATE TYPE "EstadoSesionMesa" AS ENUM ('ABIERTA', 'CUENTA_PEDIDA', 'CERRADA');

-- CreateEnum
CREATE TYPE "OrigenPedido" AS ENUM ('QR', 'MOZO', 'MOSTRADOR');

-- CreateEnum
CREATE TYPE "EstadoPedido" AS ENUM ('A_CONFIRMAR', 'CONFIRMADO', 'EN_PREPARACION', 'LISTO', 'ENTREGADO', 'ANULADO');

-- CreateEnum
CREATE TYPE "EstadoPedidoItem" AS ENUM ('VIGENTE', 'ANULADO');

-- CreateEnum
CREATE TYPE "TipoLlamado" AS ENUM ('MOZO', 'CUENTA');

-- CreateEnum
CREATE TYPE "EstadoLlamado" AS ENUM ('PENDIENTE', 'ATENDIDO');

-- CreateEnum
CREATE TYPE "EstadoTurnoCaja" AS ENUM ('ABIERTO', 'CERRADO');

-- CreateEnum
CREATE TYPE "MedioPago" AS ENUM ('EFECTIVO', 'MERCADO_PAGO', 'DEBITO', 'CREDITO');

-- CreateTable
CREATE TABLE "locales" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "estado" "EstadoLocal" NOT NULL DEFAULT 'ACTIVO',
    "zona_horaria" VARCHAR(64) NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "locales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracion_local" (
    "local_id" UUID NOT NULL,
    "aprobacion_hora_pico" BOOLEAN NOT NULL DEFAULT false,
    "umbral_senal_barra_seg" INTEGER NOT NULL DEFAULT 30,
    "pedidos_qr_pausados" BOOLEAN NOT NULL DEFAULT false,
    "pausado_por_id" UUID,
    "pausado_en" TIMESTAMPTZ(3),
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "configuracion_local_pkey" PRIMARY KEY ("local_id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL,
    "local_id" UUID NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "apellido" VARCHAR(80) NOT NULL,
    "estado" "EstadoUsuario" NOT NULL DEFAULT 'ACTIVO',
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias" (
    "id" UUID NOT NULL,
    "local_id" UUID NOT NULL,
    "nombre" VARCHAR(60) NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos" (
    "id" UUID NOT NULL,
    "local_id" UUID NOT NULL,
    "categoria_id" UUID NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "descripcion" VARCHAR(500),
    "precio" DECIMAL(14,2) NOT NULL,
    "foto_url" VARCHAR(500),
    "disponible" BOOLEAN NOT NULL DEFAULT true,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grupos_opciones" (
    "id" UUID NOT NULL,
    "local_id" UUID NOT NULL,
    "producto_id" UUID NOT NULL,
    "nombre" VARCHAR(60) NOT NULL,
    "min_elegidas" INTEGER NOT NULL DEFAULT 0,
    "max_elegidas" INTEGER NOT NULL DEFAULT 1,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "grupos_opciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opciones_producto" (
    "id" UUID NOT NULL,
    "local_id" UUID NOT NULL,
    "grupo_id" UUID NOT NULL,
    "nombre" VARCHAR(60) NOT NULL,
    "recargo" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "disponible" BOOLEAN NOT NULL DEFAULT true,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "opciones_producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mesas" (
    "id" UUID NOT NULL,
    "local_id" UUID NOT NULL,
    "numero" INTEGER NOT NULL,
    "codigo_qr" VARCHAR(16) NOT NULL,
    "codigo_qr_generado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sector" VARCHAR(40),
    "forma" "FormaMesa" NOT NULL DEFAULT 'CUADRADA',
    "sillas" INTEGER NOT NULL DEFAULT 4,
    "pos_x" INTEGER NOT NULL DEFAULT 0,
    "pos_y" INTEGER NOT NULL DEFAULT 0,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "mesas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesiones_mesa" (
    "id" UUID NOT NULL,
    "local_id" UUID NOT NULL,
    "mesa_id" UUID,
    "estado" "EstadoSesionMesa" NOT NULL DEFAULT 'ABIERTA',
    "abierta_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "abierta_por_id" UUID,
    "cerrada_en" TIMESTAMPTZ(3),
    "cerrada_por_id" UUID,

    CONSTRAINT "sesiones_mesa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedidos" (
    "id" UUID NOT NULL,
    "local_id" UUID NOT NULL,
    "sesion_id" UUID NOT NULL,
    "origen" "OrigenPedido" NOT NULL,
    "estado" "EstadoPedido" NOT NULL,
    "clave_idempotencia" UUID NOT NULL,
    "huella_solicitud" VARCHAR(64) NOT NULL,
    "cargado_por_id" UUID,
    "cargado_en" TIMESTAMPTZ(3),
    "confirmado_por_id" UUID,
    "confirmado_en" TIMESTAMPTZ(3),
    "listo_en" TIMESTAMPTZ(3),
    "entregado_en" TIMESTAMPTZ(3),
    "anulado_por_id" UUID,
    "anulado_en" TIMESTAMPTZ(3),
    "motivo_anulacion" VARCHAR(200),
    "en_contingencia" BOOLEAN NOT NULL DEFAULT false,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "pedidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedido_items" (
    "id" UUID NOT NULL,
    "local_id" UUID NOT NULL,
    "pedido_id" UUID NOT NULL,
    "producto_id" UUID NOT NULL,
    "nombre_producto" VARCHAR(80) NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio_unitario" DECIMAL(14,2) NOT NULL,
    "nota" VARCHAR(200),
    "estado" "EstadoPedidoItem" NOT NULL DEFAULT 'VIGENTE',
    "anulado_por_id" UUID,
    "anulado_en" TIMESTAMPTZ(3),
    "motivo_anulacion" VARCHAR(200),
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pedido_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedido_item_opciones" (
    "id" UUID NOT NULL,
    "local_id" UUID NOT NULL,
    "pedido_item_id" UUID NOT NULL,
    "opcion_id" UUID NOT NULL,
    "nombre_grupo" VARCHAR(60) NOT NULL,
    "nombre_opcion" VARCHAR(60) NOT NULL,
    "recargo" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "pedido_item_opciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "llamados" (
    "id" UUID NOT NULL,
    "local_id" UUID NOT NULL,
    "sesion_id" UUID NOT NULL,
    "tipo" "TipoLlamado" NOT NULL,
    "estado" "EstadoLlamado" NOT NULL DEFAULT 'PENDIENTE',
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atendido_por_id" UUID,
    "atendido_en" TIMESTAMPTZ(3),

    CONSTRAINT "llamados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "turnos_caja" (
    "id" UUID NOT NULL,
    "local_id" UUID NOT NULL,
    "estado" "EstadoTurnoCaja" NOT NULL DEFAULT 'ABIERTO',
    "abierto_por_id" UUID NOT NULL,
    "abierto_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cerrado_por_id" UUID,
    "cerrado_en" TIMESTAMPTZ(3),
    "efectivo_esperado" DECIMAL(14,2),
    "efectivo_declarado" DECIMAL(14,2),
    "diferencia" DECIMAL(14,2),
    "notas" VARCHAR(500),

    CONSTRAINT "turnos_caja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos" (
    "id" UUID NOT NULL,
    "local_id" UUID NOT NULL,
    "sesion_id" UUID NOT NULL,
    "turno_id" UUID NOT NULL,
    "monto" DECIMAL(14,2) NOT NULL,
    "medio" "MedioPago" NOT NULL,
    "propina" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "registrado_por_id" UUID NOT NULL,
    "en_contingencia" BOOLEAN NOT NULL DEFAULT false,
    "cargado_por_id" UUID,
    "cargado_en" TIMESTAMPTZ(3),
    "anula_a_id" UUID,
    "motivo_anulacion" VARCHAR(200),
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_local_id_estado_idx" ON "usuarios"("local_id", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_local_id_id_key" ON "usuarios"("local_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_local_id_id_key" ON "categorias"("local_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_local_id_nombre_key" ON "categorias"("local_id", "nombre");

-- CreateIndex
CREATE INDEX "productos_local_id_categoria_id_orden_idx" ON "productos"("local_id", "categoria_id", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "productos_local_id_id_key" ON "productos"("local_id", "id");

-- CreateIndex
CREATE INDEX "grupos_opciones_local_id_producto_id_idx" ON "grupos_opciones"("local_id", "producto_id");

-- CreateIndex
CREATE UNIQUE INDEX "grupos_opciones_local_id_id_key" ON "grupos_opciones"("local_id", "id");

-- CreateIndex
CREATE INDEX "opciones_producto_local_id_grupo_id_idx" ON "opciones_producto"("local_id", "grupo_id");

-- CreateIndex
CREATE UNIQUE INDEX "opciones_producto_local_id_id_key" ON "opciones_producto"("local_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "mesas_codigo_qr_key" ON "mesas"("codigo_qr");

-- CreateIndex
CREATE UNIQUE INDEX "mesas_local_id_id_key" ON "mesas"("local_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "mesas_local_id_numero_key" ON "mesas"("local_id", "numero");

-- CreateIndex
CREATE INDEX "sesiones_mesa_local_id_estado_idx" ON "sesiones_mesa"("local_id", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "sesiones_mesa_local_id_id_key" ON "sesiones_mesa"("local_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "sesiones_mesa_una_abierta_por_mesa" ON "sesiones_mesa"("local_id", "mesa_id") WHERE (estado <> 'CERRADA' AND mesa_id IS NOT NULL);

-- CreateIndex
CREATE INDEX "pedidos_local_id_sesion_id_idx" ON "pedidos"("local_id", "sesion_id");

-- CreateIndex
CREATE INDEX "pedidos_local_id_estado_creado_en_idx" ON "pedidos"("local_id", "estado", "creado_en");

-- CreateIndex
CREATE UNIQUE INDEX "pedidos_local_id_id_key" ON "pedidos"("local_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "pedidos_local_id_clave_idempotencia_key" ON "pedidos"("local_id", "clave_idempotencia");

-- CreateIndex
CREATE INDEX "pedido_items_local_id_pedido_id_idx" ON "pedido_items"("local_id", "pedido_id");

-- CreateIndex
CREATE UNIQUE INDEX "pedido_items_local_id_id_key" ON "pedido_items"("local_id", "id");

-- CreateIndex
CREATE INDEX "pedido_item_opciones_local_id_pedido_item_id_idx" ON "pedido_item_opciones"("local_id", "pedido_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "pedido_item_opciones_local_id_id_key" ON "pedido_item_opciones"("local_id", "id");

-- CreateIndex
CREATE INDEX "llamados_local_id_estado_creado_en_idx" ON "llamados"("local_id", "estado", "creado_en");

-- CreateIndex
CREATE UNIQUE INDEX "llamados_local_id_id_key" ON "llamados"("local_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "llamados_uno_pendiente_por_tipo" ON "llamados"("local_id", "sesion_id", "tipo") WHERE (estado = 'PENDIENTE');

-- CreateIndex
CREATE INDEX "turnos_caja_local_id_abierto_en_idx" ON "turnos_caja"("local_id", "abierto_en");

-- CreateIndex
CREATE UNIQUE INDEX "turnos_caja_local_id_id_key" ON "turnos_caja"("local_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "turnos_caja_uno_abierto_por_local" ON "turnos_caja"("local_id") WHERE (estado = 'ABIERTO');

-- CreateIndex
CREATE INDEX "pagos_local_id_sesion_id_idx" ON "pagos"("local_id", "sesion_id");

-- CreateIndex
CREATE INDEX "pagos_local_id_turno_id_idx" ON "pagos"("local_id", "turno_id");

-- CreateIndex
CREATE UNIQUE INDEX "pagos_local_id_id_key" ON "pagos"("local_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "pagos_local_id_anula_a_id_key" ON "pagos"("local_id", "anula_a_id");

-- AddForeignKey
ALTER TABLE "configuracion_local" ADD CONSTRAINT "configuracion_local_local_id_fkey" FOREIGN KEY ("local_id") REFERENCES "locales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuracion_local" ADD CONSTRAINT "configuracion_local_local_id_pausado_por_id_fkey" FOREIGN KEY ("local_id", "pausado_por_id") REFERENCES "usuarios"("local_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_local_id_fkey" FOREIGN KEY ("local_id") REFERENCES "locales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_local_id_fkey" FOREIGN KEY ("local_id") REFERENCES "locales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_local_id_fkey" FOREIGN KEY ("local_id") REFERENCES "locales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_local_id_categoria_id_fkey" FOREIGN KEY ("local_id", "categoria_id") REFERENCES "categorias"("local_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grupos_opciones" ADD CONSTRAINT "grupos_opciones_local_id_fkey" FOREIGN KEY ("local_id") REFERENCES "locales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grupos_opciones" ADD CONSTRAINT "grupos_opciones_local_id_producto_id_fkey" FOREIGN KEY ("local_id", "producto_id") REFERENCES "productos"("local_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opciones_producto" ADD CONSTRAINT "opciones_producto_local_id_fkey" FOREIGN KEY ("local_id") REFERENCES "locales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opciones_producto" ADD CONSTRAINT "opciones_producto_local_id_grupo_id_fkey" FOREIGN KEY ("local_id", "grupo_id") REFERENCES "grupos_opciones"("local_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mesas" ADD CONSTRAINT "mesas_local_id_fkey" FOREIGN KEY ("local_id") REFERENCES "locales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones_mesa" ADD CONSTRAINT "sesiones_mesa_local_id_fkey" FOREIGN KEY ("local_id") REFERENCES "locales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones_mesa" ADD CONSTRAINT "sesiones_mesa_local_id_mesa_id_fkey" FOREIGN KEY ("local_id", "mesa_id") REFERENCES "mesas"("local_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones_mesa" ADD CONSTRAINT "sesiones_mesa_local_id_abierta_por_id_fkey" FOREIGN KEY ("local_id", "abierta_por_id") REFERENCES "usuarios"("local_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones_mesa" ADD CONSTRAINT "sesiones_mesa_local_id_cerrada_por_id_fkey" FOREIGN KEY ("local_id", "cerrada_por_id") REFERENCES "usuarios"("local_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_local_id_fkey" FOREIGN KEY ("local_id") REFERENCES "locales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_local_id_sesion_id_fkey" FOREIGN KEY ("local_id", "sesion_id") REFERENCES "sesiones_mesa"("local_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_local_id_cargado_por_id_fkey" FOREIGN KEY ("local_id", "cargado_por_id") REFERENCES "usuarios"("local_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_local_id_confirmado_por_id_fkey" FOREIGN KEY ("local_id", "confirmado_por_id") REFERENCES "usuarios"("local_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_local_id_anulado_por_id_fkey" FOREIGN KEY ("local_id", "anulado_por_id") REFERENCES "usuarios"("local_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_items" ADD CONSTRAINT "pedido_items_local_id_fkey" FOREIGN KEY ("local_id") REFERENCES "locales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_items" ADD CONSTRAINT "pedido_items_local_id_pedido_id_fkey" FOREIGN KEY ("local_id", "pedido_id") REFERENCES "pedidos"("local_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_items" ADD CONSTRAINT "pedido_items_local_id_producto_id_fkey" FOREIGN KEY ("local_id", "producto_id") REFERENCES "productos"("local_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_items" ADD CONSTRAINT "pedido_items_local_id_anulado_por_id_fkey" FOREIGN KEY ("local_id", "anulado_por_id") REFERENCES "usuarios"("local_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_item_opciones" ADD CONSTRAINT "pedido_item_opciones_local_id_fkey" FOREIGN KEY ("local_id") REFERENCES "locales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_item_opciones" ADD CONSTRAINT "pedido_item_opciones_local_id_pedido_item_id_fkey" FOREIGN KEY ("local_id", "pedido_item_id") REFERENCES "pedido_items"("local_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_item_opciones" ADD CONSTRAINT "pedido_item_opciones_local_id_opcion_id_fkey" FOREIGN KEY ("local_id", "opcion_id") REFERENCES "opciones_producto"("local_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "llamados" ADD CONSTRAINT "llamados_local_id_fkey" FOREIGN KEY ("local_id") REFERENCES "locales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "llamados" ADD CONSTRAINT "llamados_local_id_sesion_id_fkey" FOREIGN KEY ("local_id", "sesion_id") REFERENCES "sesiones_mesa"("local_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "llamados" ADD CONSTRAINT "llamados_local_id_atendido_por_id_fkey" FOREIGN KEY ("local_id", "atendido_por_id") REFERENCES "usuarios"("local_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turnos_caja" ADD CONSTRAINT "turnos_caja_local_id_fkey" FOREIGN KEY ("local_id") REFERENCES "locales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turnos_caja" ADD CONSTRAINT "turnos_caja_local_id_abierto_por_id_fkey" FOREIGN KEY ("local_id", "abierto_por_id") REFERENCES "usuarios"("local_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turnos_caja" ADD CONSTRAINT "turnos_caja_local_id_cerrado_por_id_fkey" FOREIGN KEY ("local_id", "cerrado_por_id") REFERENCES "usuarios"("local_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_local_id_fkey" FOREIGN KEY ("local_id") REFERENCES "locales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_local_id_sesion_id_fkey" FOREIGN KEY ("local_id", "sesion_id") REFERENCES "sesiones_mesa"("local_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_local_id_turno_id_fkey" FOREIGN KEY ("local_id", "turno_id") REFERENCES "turnos_caja"("local_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_local_id_registrado_por_id_fkey" FOREIGN KEY ("local_id", "registrado_por_id") REFERENCES "usuarios"("local_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_local_id_cargado_por_id_fkey" FOREIGN KEY ("local_id", "cargado_por_id") REFERENCES "usuarios"("local_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_local_id_anula_a_id_fkey" FOREIGN KEY ("local_id", "anula_a_id") REFERENCES "pagos"("local_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════
-- Escrito a mano: restricciones que Prisma no expresa (ADR 0001).
-- Prisma no compara CHECK ni triggers: no generan drift en `db:check-drift`.
-- ═══════════════════════════════════════════════════════════════════════════

-- Configuración del local
ALTER TABLE "configuracion_local"
  ADD CONSTRAINT "configuracion_local_umbral_positivo" CHECK ("umbral_senal_barra_seg" > 0),
  ADD CONSTRAINT "configuracion_local_pausa_completa" CHECK (
    NOT "pedidos_qr_pausados" OR ("pausado_por_id" IS NOT NULL AND "pausado_en" IS NOT NULL)
  );

-- Carta
ALTER TABLE "productos"
  ADD CONSTRAINT "productos_precio_no_negativo" CHECK ("precio" >= 0);

ALTER TABLE "grupos_opciones"
  ADD CONSTRAINT "grupos_opciones_min_max" CHECK (
    "min_elegidas" >= 0 AND "max_elegidas" >= 1 AND "min_elegidas" <= "max_elegidas"
  );

ALTER TABLE "opciones_producto"
  ADD CONSTRAINT "opciones_producto_recargo_no_negativo" CHECK ("recargo" >= 0);

-- Salón
ALTER TABLE "mesas"
  ADD CONSTRAINT "mesas_numero_positivo" CHECK ("numero" > 0),
  ADD CONSTRAINT "mesas_sillas_no_negativas" CHECK ("sillas" >= 0);

ALTER TABLE "sesiones_mesa"
  ADD CONSTRAINT "sesiones_mesa_cierre_completo" CHECK (
    ("estado" = 'CERRADA') = ("cerrada_en" IS NOT NULL)
  );

-- Pedidos
ALTER TABLE "pedidos"
  ADD CONSTRAINT "pedidos_anulacion_completa" CHECK (
    ("estado" = 'ANULADO') = (
      "anulado_por_id" IS NOT NULL AND "anulado_en" IS NOT NULL AND "motivo_anulacion" IS NOT NULL
    )
  ),
  ADD CONSTRAINT "pedidos_contingencia_con_carga" CHECK (
    NOT "en_contingencia" OR ("cargado_por_id" IS NOT NULL AND "cargado_en" IS NOT NULL)
  ),
  ADD CONSTRAINT "pedidos_mozo_con_carga" CHECK (
    "origen" <> 'MOZO' OR "cargado_por_id" IS NOT NULL
  );

ALTER TABLE "pedido_items"
  ADD CONSTRAINT "pedido_items_cantidad_positiva" CHECK ("cantidad" > 0),
  ADD CONSTRAINT "pedido_items_precio_no_negativo" CHECK ("precio_unitario" >= 0),
  ADD CONSTRAINT "pedido_items_anulacion_completa" CHECK (
    ("estado" = 'ANULADO') = (
      "anulado_por_id" IS NOT NULL AND "anulado_en" IS NOT NULL AND "motivo_anulacion" IS NOT NULL
    )
  );

ALTER TABLE "pedido_item_opciones"
  ADD CONSTRAINT "pedido_item_opciones_recargo_no_negativo" CHECK ("recargo" >= 0);

-- Llamados
ALTER TABLE "llamados"
  ADD CONSTRAINT "llamados_atencion_completa" CHECK (
    ("estado" = 'ATENDIDO') = ("atendido_por_id" IS NOT NULL AND "atendido_en" IS NOT NULL)
  );

-- Turnos de caja
ALTER TABLE "turnos_caja"
  ADD CONSTRAINT "turnos_caja_cierre_completo" CHECK (
    ("estado" = 'CERRADO') = (
      "cerrado_por_id" IS NOT NULL AND "cerrado_en" IS NOT NULL
      AND "efectivo_esperado" IS NOT NULL AND "efectivo_declarado" IS NOT NULL
      AND "diferencia" IS NOT NULL
    )
  ),
  ADD CONSTRAINT "turnos_caja_diferencia_cuadra" CHECK (
    "diferencia" IS NULL OR "diferencia" = "efectivo_declarado" - "efectivo_esperado"
  );

-- Pagos: pago normal o contramovimiento (ADR 0004)
ALTER TABLE "pagos"
  ADD CONSTRAINT "pagos_normal_o_contramovimiento" CHECK (
    (
      "anula_a_id" IS NULL AND "monto" > 0 AND "propina" >= 0 AND "motivo_anulacion" IS NULL
    ) OR (
      "anula_a_id" IS NOT NULL AND "monto" < 0 AND "propina" <= 0 AND "motivo_anulacion" IS NOT NULL
    )
  ),
  ADD CONSTRAINT "pagos_contingencia_con_carga" CHECK (
    NOT "en_contingencia" OR ("cargado_por_id" IS NOT NULL AND "cargado_en" IS NOT NULL)
  ),
  ADD CONSTRAINT "pagos_no_se_anula_a_si_mismo" CHECK ("anula_a_id" IS NULL OR "anula_a_id" <> "id");

-- Pagos inmutables: ni UPDATE, ni DELETE, ni TRUNCATE (ADR 0004). Los tests vacían la base
-- deshabilitando "pagos_sin_truncate" un momento (test/utils/base-de-test.ts).
CREATE FUNCTION "rechazar_cambio_inmutable"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'La tabla % es inmutable: % no permitido. Se anula con un contramovimiento.',
    TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE TRIGGER "pagos_inmutables"
  BEFORE UPDATE OR DELETE ON "pagos"
  FOR EACH ROW EXECUTE FUNCTION "rechazar_cambio_inmutable"();

CREATE TRIGGER "pagos_sin_truncate"
  BEFORE TRUNCATE ON "pagos"
  FOR EACH STATEMENT EXECUTE FUNCTION "rechazar_cambio_inmutable"();
