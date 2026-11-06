import { randomBytes, randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';

/**
 * Fixtures con SQL directo para los e2e del modelo. Los `id` no tienen default en la base
 * (Prisma los genera), así que se pasan acá. Cada helper acepta `extra` para pisar columnas.
 */
export type Conexion = Pool | PoolClient;
export type Fila = Record<string, unknown>;

/** INSERT genérico: arma columnas y parámetros a partir de un objeto. Devuelve la fila. */
export async function insertar(db: Conexion, tabla: string, valores: Fila): Promise<Fila> {
  const columnas = Object.keys(valores);
  const params = columnas.map((_, i) => `$${i + 1}`);
  const sql = `INSERT INTO "${tabla}" (${columnas.map((c) => `"${c}"`).join(', ')})
               VALUES (${params.join(', ')}) RETURNING *`;
  const { rows } = await db.query<Fila>(sql, Object.values(valores));
  return rows[0];
}

const ahora = () => new Date();

export function codigoQrAleatorio(): string {
  return randomBytes(8).toString('hex').slice(0, 12);
}

export async function crearLocal(db: Conexion, extra: Fila = {}): Promise<string> {
  const id = randomUUID();
  await insertar(db, 'locales', {
    id,
    nombre: `Café ${id.slice(0, 6)}`,
    actualizado_en: ahora(),
    ...extra,
  });
  return id;
}

export async function crearUsuario(
  db: Conexion,
  localId: string,
  extra: Fila = {},
): Promise<string> {
  const id = randomUUID();
  await insertar(db, 'usuarios', {
    id,
    local_id: localId,
    email: `${id}@test.local`,
    password_hash: 'x',
    nombre: 'Ana',
    apellido: 'Pérez',
    actualizado_en: ahora(),
    ...extra,
  });
  return id;
}

export async function crearCategoria(
  db: Conexion,
  localId: string,
  extra: Fila = {},
): Promise<string> {
  const id = randomUUID();
  await insertar(db, 'categorias', {
    id,
    local_id: localId,
    nombre: `Cafetería ${id.slice(0, 6)}`,
    actualizado_en: ahora(),
    ...extra,
  });
  return id;
}

export async function crearProducto(
  db: Conexion,
  localId: string,
  extra: Fila = {},
): Promise<string> {
  const categoriaId =
    (extra.categoria_id as string | undefined) ?? (await crearCategoria(db, localId));
  const id = randomUUID();
  await insertar(db, 'productos', {
    id,
    local_id: localId,
    categoria_id: categoriaId,
    nombre: 'Café chico',
    precio: '2500.00',
    actualizado_en: ahora(),
    ...extra,
  });
  return id;
}

export async function crearGrupoOpciones(
  db: Conexion,
  localId: string,
  productoId: string,
  extra: Fila = {},
): Promise<string> {
  const id = randomUUID();
  await insertar(db, 'grupos_opciones', {
    id,
    local_id: localId,
    producto_id: productoId,
    nombre: 'Leche',
    actualizado_en: ahora(),
    ...extra,
  });
  return id;
}

export async function crearOpcion(
  db: Conexion,
  localId: string,
  grupoId: string,
  extra: Fila = {},
): Promise<string> {
  const id = randomUUID();
  await insertar(db, 'opciones_producto', {
    id,
    local_id: localId,
    grupo_id: grupoId,
    nombre: 'Almendras',
    recargo: '500.00',
    actualizado_en: ahora(),
    ...extra,
  });
  return id;
}

let ultimoNumeroMesa = 0;
export async function crearMesa(db: Conexion, localId: string, extra: Fila = {}): Promise<string> {
  const id = randomUUID();
  ultimoNumeroMesa += 1;
  await insertar(db, 'mesas', {
    id,
    local_id: localId,
    numero: ultimoNumeroMesa,
    codigo_qr: codigoQrAleatorio(),
    actualizado_en: ahora(),
    ...extra,
  });
  return id;
}

export async function crearSesion(
  db: Conexion,
  localId: string,
  mesaId: string | null,
  extra: Fila = {},
): Promise<string> {
  const id = randomUUID();
  await insertar(db, 'sesiones_mesa', { id, local_id: localId, mesa_id: mesaId, ...extra });
  return id;
}

export function datosPedido(localId: string, sesionId: string, extra: Fila = {}): Fila {
  return {
    id: randomUUID(),
    local_id: localId,
    sesion_id: sesionId,
    origen: 'QR',
    estado: 'A_CONFIRMAR',
    clave_idempotencia: randomUUID(),
    huella_solicitud: 'a'.repeat(64),
    actualizado_en: ahora(),
    ...extra,
  };
}

export async function crearPedido(
  db: Conexion,
  localId: string,
  sesionId: string,
  extra: Fila = {},
): Promise<string> {
  const fila = await insertar(db, 'pedidos', datosPedido(localId, sesionId, extra));
  return fila.id as string;
}

export function datosItem(
  localId: string,
  pedidoId: string,
  productoId: string,
  extra: Fila = {},
): Fila {
  return {
    id: randomUUID(),
    local_id: localId,
    pedido_id: pedidoId,
    producto_id: productoId,
    nombre_producto: 'Café chico',
    cantidad: 1,
    precio_unitario: '2500.00',
    ...extra,
  };
}

export function datosTurno(localId: string, abiertoPorId: string, extra: Fila = {}): Fila {
  return { id: randomUUID(), local_id: localId, abierto_por_id: abiertoPorId, ...extra };
}

export async function crearTurno(
  db: Conexion,
  localId: string,
  abiertoPorId: string,
  extra: Fila = {},
): Promise<string> {
  const fila = await insertar(db, 'turnos_caja', datosTurno(localId, abiertoPorId, extra));
  return fila.id as string;
}

export function datosPago(
  localId: string,
  sesionId: string,
  turnoId: string,
  registradoPorId: string,
  extra: Fila = {},
): Fila {
  return {
    id: randomUUID(),
    local_id: localId,
    sesion_id: sesionId,
    turno_id: turnoId,
    monto: '5000.00',
    medio: 'EFECTIVO',
    registrado_por_id: registradoPorId,
    ...extra,
  };
}

/** Un local completo con usuario, mesa, sesión abierta y turno abierto. */
export interface Escenario {
  localId: string;
  usuarioId: string;
  mesaId: string;
  sesionId: string;
  turnoId: string;
  productoId: string;
}

export async function crearEscenario(db: Conexion): Promise<Escenario> {
  const localId = await crearLocal(db);
  const usuarioId = await crearUsuario(db, localId);
  const mesaId = await crearMesa(db, localId);
  const sesionId = await crearSesion(db, localId, mesaId);
  const turnoId = await crearTurno(db, localId, usuarioId);
  const productoId = await crearProducto(db, localId);
  return { localId, usuarioId, mesaId, sesionId, turnoId, productoId };
}

/** Error de PostgreSQL tal como lo expone `pg`. */
export interface ErrorPg {
  code?: string;
  constraint?: string;
  message: string;
}

/** Espera que la promesa falle y devuelve el error de la base. Falla si no rechaza. */
export async function errorDe(promesa: Promise<unknown>): Promise<ErrorPg> {
  try {
    await promesa;
  } catch (error) {
    return error as ErrorPg;
  }
  throw new Error('Se esperaba que la base rechazara la operación, pero la aceptó');
}

export const SQLSTATE = {
  violacionUnica: '23505',
  violacionFk: '23503',
  violacionCheck: '23514',
  restrictViolation: '23001',
} as const;
