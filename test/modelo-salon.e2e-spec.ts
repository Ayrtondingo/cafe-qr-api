import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { conectarBaseDeTest, vaciarBase } from './utils/base-de-test';
import {
  SQLSTATE,
  codigoQrAleatorio,
  crearLocal,
  crearMesa,
  crearSesion,
  crearUsuario,
  errorDe,
  insertar,
} from './utils/fixtures';

/** Restricciones del modelo de salón (mesas, sesiones de mesa, llamados) contra PostgreSQL real. */
describe('Modelo de salón (e2e, PostgreSQL)', () => {
  let pool: Pool;

  beforeAll(() => {
    pool = conectarBaseDeTest();
  });
  afterAll(async () => {
    await pool.end();
  });
  beforeEach(async () => {
    await vaciarBase(pool);
  });

  describe('mesas', () => {
    it('el código QR es único en todos los locales', async () => {
      const localA = await crearLocal(pool);
      const localB = await crearLocal(pool);
      const codigo = codigoQrAleatorio();
      await crearMesa(pool, localA, { codigo_qr: codigo });

      const error = await errorDe(crearMesa(pool, localB, { codigo_qr: codigo }));

      expect(error.code).toBe(SQLSTATE.violacionUnica);
      expect(error.constraint).toBe('mesas_codigo_qr_key');
    });

    it('no permite repetir el número de mesa en el mismo local', async () => {
      const local = await crearLocal(pool);
      await crearMesa(pool, local, { numero: 5 });

      const error = await errorDe(crearMesa(pool, local, { numero: 5 }));

      expect(error.code).toBe(SQLSTATE.violacionUnica);
      expect(error.constraint).toBe('mesas_local_id_numero_key');
    });

    it('permite el mismo número de mesa en otro local', async () => {
      const localA = await crearLocal(pool);
      const localB = await crearLocal(pool);
      await crearMesa(pool, localA, { numero: 5 });

      await expect(crearMesa(pool, localB, { numero: 5 })).resolves.toEqual(expect.any(String));
    });

    it('rechaza número de mesa 0 o sillas negativas', async () => {
      const local = await crearLocal(pool);

      const sinNumero = await errorDe(crearMesa(pool, local, { numero: 0 }));
      const sillas = await errorDe(crearMesa(pool, local, { sillas: -1 }));

      expect(sinNumero.constraint).toBe('mesas_numero_positivo');
      expect(sillas.constraint).toBe('mesas_sillas_no_negativas');
    });
  });

  describe('sesiones de mesa', () => {
    it('no permite dos sesiones abiertas en la misma mesa', async () => {
      const local = await crearLocal(pool);
      const mesa = await crearMesa(pool, local);
      await crearSesion(pool, local, mesa);

      const error = await errorDe(crearSesion(pool, local, mesa));

      expect(error.code).toBe(SQLSTATE.violacionUnica);
      expect(error.constraint).toBe('sesiones_mesa_una_abierta_por_mesa');
    });

    it('no permite abrir otra sesión si la anterior está en cuenta pedida', async () => {
      const local = await crearLocal(pool);
      const mesa = await crearMesa(pool, local);
      await crearSesion(pool, local, mesa, { estado: 'CUENTA_PEDIDA' });

      const error = await errorDe(crearSesion(pool, local, mesa));

      expect(error.constraint).toBe('sesiones_mesa_una_abierta_por_mesa');
    });

    it('cerrada la sesión anterior, la mesa puede abrir una nueva', async () => {
      const local = await crearLocal(pool);
      const mesa = await crearMesa(pool, local);
      const primera = await crearSesion(pool, local, mesa);
      await pool.query(
        `UPDATE sesiones_mesa SET estado = 'CERRADA', cerrada_en = now() WHERE id = $1`,
        [primera],
      );

      await expect(crearSesion(pool, local, mesa)).resolves.toEqual(expect.any(String));
    });

    it('dos aperturas simultáneas en la misma mesa: gana exactamente una', async () => {
      const local = await crearLocal(pool);
      const mesa = await crearMesa(pool, local);

      const abrirEnTransaccion = async () => {
        const cliente = await pool.connect();
        try {
          await cliente.query('BEGIN');
          await crearSesion(cliente, local, mesa);
          // Mantiene la transacción abierta para que la otra choque con el índice en curso.
          await cliente.query('SELECT pg_sleep(0.3)');
          await cliente.query('COMMIT');
        } catch (error) {
          await cliente.query('ROLLBACK');
          throw error;
        } finally {
          cliente.release();
        }
      };

      const resultados = await Promise.allSettled([abrirEnTransaccion(), abrirEnTransaccion()]);

      const ok = resultados.filter((r) => r.status === 'fulfilled');
      const fallidas = resultados.filter((r) => r.status === 'rejected');
      expect(ok).toHaveLength(1);
      expect(fallidas).toHaveLength(1);
      expect(fallidas[0].reason).toMatchObject({
        code: SQLSTATE.violacionUnica,
        constraint: 'sesiones_mesa_una_abierta_por_mesa',
      });
      const { rows } = await pool.query(
        `SELECT count(*)::int AS n FROM sesiones_mesa WHERE mesa_id = $1`,
        [mesa],
      );
      expect(rows[0]).toEqual({ n: 1 });
    });

    it('permite varias sesiones de mostrador (sin mesa) abiertas a la vez', async () => {
      const local = await crearLocal(pool);
      await crearSesion(pool, local, null);

      await expect(crearSesion(pool, local, null)).resolves.toEqual(expect.any(String));
    });

    it('una sesión cerrada exige fecha de cierre', async () => {
      const local = await crearLocal(pool);
      const mesa = await crearMesa(pool, local);

      const error = await errorDe(crearSesion(pool, local, mesa, { estado: 'CERRADA' }));

      expect(error.code).toBe(SQLSTATE.violacionCheck);
      expect(error.constraint).toBe('sesiones_mesa_cierre_completo');
    });

    it('una sesión abierta no puede tener fecha de cierre', async () => {
      const local = await crearLocal(pool);
      const mesa = await crearMesa(pool, local);

      const error = await errorDe(crearSesion(pool, local, mesa, { cerrada_en: new Date() }));

      expect(error.constraint).toBe('sesiones_mesa_cierre_completo');
    });

    it('no se puede abrir una sesión con una mesa de otro local', async () => {
      const localA = await crearLocal(pool);
      const localB = await crearLocal(pool);
      const mesaDeB = await crearMesa(pool, localB);

      const error = await errorDe(crearSesion(pool, localA, mesaDeB));

      expect(error.code).toBe(SQLSTATE.violacionFk);
      expect(error.constraint).toBe('sesiones_mesa_local_id_mesa_id_fkey');
    });

    it('no se puede registrar como abierta por un usuario de otro local', async () => {
      const localA = await crearLocal(pool);
      const localB = await crearLocal(pool);
      const mesa = await crearMesa(pool, localA);
      const usuarioDeB = await crearUsuario(pool, localB);

      const error = await errorDe(crearSesion(pool, localA, mesa, { abierta_por_id: usuarioDeB }));

      expect(error.code).toBe(SQLSTATE.violacionFk);
      expect(error.constraint).toBe('sesiones_mesa_local_id_abierta_por_id_fkey');
    });
  });

  describe('llamados', () => {
    const crearLlamado = (local: string, sesion: string, extra: Record<string, unknown> = {}) =>
      insertar(pool, 'llamados', {
        id: randomUUID(),
        local_id: local,
        sesion_id: sesion,
        tipo: 'MOZO',
        ...extra,
      });

    it('no permite dos llamados pendientes del mismo tipo en la misma sesión', async () => {
      const local = await crearLocal(pool);
      const sesion = await crearSesion(pool, local, await crearMesa(pool, local));
      await crearLlamado(local, sesion);

      const error = await errorDe(crearLlamado(local, sesion));

      expect(error.code).toBe(SQLSTATE.violacionUnica);
      expect(error.constraint).toBe('llamados_uno_pendiente_por_tipo');
    });

    it('permite un llamado al mozo y un pedido de cuenta pendientes a la vez', async () => {
      const local = await crearLocal(pool);
      const sesion = await crearSesion(pool, local, await crearMesa(pool, local));
      await crearLlamado(local, sesion, { tipo: 'MOZO' });

      await expect(crearLlamado(local, sesion, { tipo: 'CUENTA' })).resolves.toBeDefined();
    });

    it('atendido el llamado, la mesa puede volver a llamar', async () => {
      const local = await crearLocal(pool);
      const usuario = await crearUsuario(pool, local);
      const sesion = await crearSesion(pool, local, await crearMesa(pool, local));
      const llamado = await crearLlamado(local, sesion);
      await pool.query(
        `UPDATE llamados SET estado = 'ATENDIDO', atendido_por_id = $2, atendido_en = now()
          WHERE id = $1`,
        [llamado.id, usuario],
      );

      await expect(crearLlamado(local, sesion)).resolves.toBeDefined();
    });

    it('un llamado atendido exige quién lo atendió', async () => {
      const local = await crearLocal(pool);
      const sesion = await crearSesion(pool, local, await crearMesa(pool, local));

      const error = await errorDe(
        crearLlamado(local, sesion, { estado: 'ATENDIDO', atendido_en: new Date() }),
      );

      expect(error.code).toBe(SQLSTATE.violacionCheck);
      expect(error.constraint).toBe('llamados_atencion_completa');
    });

    it('no se puede crear un llamado para una sesión de otro local', async () => {
      const localA = await crearLocal(pool);
      const localB = await crearLocal(pool);
      const sesionDeB = await crearSesion(pool, localB, await crearMesa(pool, localB));

      const error = await errorDe(crearLlamado(localA, sesionDeB));

      expect(error.code).toBe(SQLSTATE.violacionFk);
      expect(error.constraint).toBe('llamados_local_id_sesion_id_fkey');
    });

    it('no puede atender un llamado un usuario de otro local', async () => {
      const localA = await crearLocal(pool);
      const localB = await crearLocal(pool);
      const usuarioDeB = await crearUsuario(pool, localB);
      const sesion = await crearSesion(pool, localA, await crearMesa(pool, localA));

      const error = await errorDe(
        crearLlamado(localA, sesion, {
          estado: 'ATENDIDO',
          atendido_por_id: usuarioDeB,
          atendido_en: new Date(),
        }),
      );

      expect(error.code).toBe(SQLSTATE.violacionFk);
      expect(error.constraint).toBe('llamados_local_id_atendido_por_id_fkey');
    });
  });
});
