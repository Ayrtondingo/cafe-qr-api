import type { Pool } from 'pg';
import { conectarBaseDeTest, vaciarBase } from './utils/base-de-test';
import {
  SQLSTATE,
  crearEscenario,
  crearLocal,
  crearUsuario,
  datosPago,
  datosTurno,
  errorDe,
  insertar,
  type Escenario,
  type Fila,
} from './utils/fixtures';

/** Restricciones del modelo de caja (turnos y pagos inmutables) contra PostgreSQL real. */
describe('Modelo de caja (e2e, PostgreSQL)', () => {
  let pool: Pool;
  let a: Escenario;

  beforeAll(() => {
    pool = conectarBaseDeTest();
  });
  afterAll(async () => {
    await pool.end();
  });
  beforeEach(async () => {
    await vaciarBase(pool);
    a = await crearEscenario(pool);
  });

  const pagar = (extra: Fila = {}) =>
    insertar(pool, 'pagos', datosPago(a.localId, a.sesionId, a.turnoId, a.usuarioId, extra));

  const cerrarTurno = (turnoId: string, usuarioId: string) =>
    pool.query(
      `UPDATE turnos_caja
          SET estado = 'CERRADO', cerrado_por_id = $2, cerrado_en = now(),
              efectivo_esperado = 1000, efectivo_declarado = 1000, diferencia = 0
        WHERE id = $1`,
      [turnoId, usuarioId],
    );

  describe('turnos de caja', () => {
    it('no permite dos turnos abiertos en el mismo local', async () => {
      // El escenario ya abrió un turno en el local A.
      const error = await errorDe(
        insertar(pool, 'turnos_caja', datosTurno(a.localId, a.usuarioId)),
      );

      expect(error.code).toBe(SQLSTATE.violacionUnica);
      expect(error.constraint).toBe('turnos_caja_uno_abierto_por_local');
    });

    it('dos aperturas de turno simultáneas en el mismo local: gana exactamente una', async () => {
      const local = await crearLocal(pool);
      const usuario = await crearUsuario(pool, local);

      const abrirEnTransaccion = async () => {
        const cliente = await pool.connect();
        try {
          await cliente.query('BEGIN');
          await insertar(cliente, 'turnos_caja', datosTurno(local, usuario));
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

      expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      const fallidas = resultados.filter((r) => r.status === 'rejected');
      expect(fallidas).toHaveLength(1);
      expect(fallidas[0].reason).toMatchObject({
        code: SQLSTATE.violacionUnica,
        constraint: 'turnos_caja_uno_abierto_por_local',
      });
      const { rows } = await pool.query(
        `SELECT count(*)::int AS n FROM turnos_caja WHERE local_id = $1`,
        [local],
      );
      expect(rows[0]).toEqual({ n: 1 });
    });

    it('permite turnos abiertos a la vez en locales distintos', async () => {
      const otro = await crearLocal(pool);
      const usuario = await crearUsuario(pool, otro);

      await expect(insertar(pool, 'turnos_caja', datosTurno(otro, usuario))).resolves.toBeDefined();
    });

    it('cerrado el turno, se puede abrir otro en el mismo local', async () => {
      await cerrarTurno(a.turnoId, a.usuarioId);

      await expect(
        insertar(pool, 'turnos_caja', datosTurno(a.localId, a.usuarioId)),
      ).resolves.toBeDefined();
    });

    it('un turno cerrado exige el efectivo declarado', async () => {
      const error = await errorDe(
        pool.query(
          `UPDATE turnos_caja
              SET estado = 'CERRADO', cerrado_por_id = $2, cerrado_en = now(),
                  efectivo_esperado = 1000, diferencia = 0
            WHERE id = $1`,
          [a.turnoId, a.usuarioId],
        ),
      );

      expect(error.code).toBe(SQLSTATE.violacionCheck);
      expect(error.constraint).toBe('turnos_caja_cierre_completo');
    });

    it('la diferencia del arqueo tiene que ser declarado menos esperado', async () => {
      const error = await errorDe(
        pool.query(
          `UPDATE turnos_caja
              SET estado = 'CERRADO', cerrado_por_id = $2, cerrado_en = now(),
                  efectivo_esperado = 10500.50, efectivo_declarado = 10000.00, diferencia = 500.50
            WHERE id = $1`,
          [a.turnoId, a.usuarioId],
        ),
      );

      expect(error.code).toBe(SQLSTATE.violacionCheck);
      expect(error.constraint).toBe('turnos_caja_diferencia_cuadra');
    });

    it('un cierre con faltante bien calculado se acepta y guarda la diferencia exacta', async () => {
      await pool.query(
        `UPDATE turnos_caja
            SET estado = 'CERRADO', cerrado_por_id = $2, cerrado_en = now(),
                efectivo_esperado = '10500.50', efectivo_declarado = '10000.00', diferencia = '-500.50'
          WHERE id = $1`,
        [a.turnoId, a.usuarioId],
      );

      const { rows } = await pool.query<{ diferencia: string }>(
        `SELECT diferencia FROM turnos_caja WHERE id = $1`,
        [a.turnoId],
      );
      expect(rows[0].diferencia).toBe('-500.50');
    });

    it('un turno no puede ser abierto por un usuario de otro local', async () => {
      const otro = await crearLocal(pool);
      const usuarioDeA = a.usuarioId;

      const error = await errorDe(insertar(pool, 'turnos_caja', datosTurno(otro, usuarioDeA)));

      expect(error.code).toBe(SQLSTATE.violacionFk);
      expect(error.constraint).toBe('turnos_caja_local_id_abierto_por_id_fkey');
    });
  });

  describe('pagos', () => {
    it('un pago no se puede modificar', async () => {
      const pago = await pagar();

      const error = await errorDe(
        pool.query(`UPDATE pagos SET monto = 1 WHERE id = $1`, [pago.id]),
      );

      expect(error.code).toBe(SQLSTATE.restrictViolation);
      expect(error.message).toMatch(/inmutable/);
    });

    it('un pago no se puede borrar', async () => {
      const pago = await pagar();

      const error = await errorDe(pool.query(`DELETE FROM pagos WHERE id = $1`, [pago.id]));

      expect(error.code).toBe(SQLSTATE.restrictViolation);
      const { rows } = await pool.query(`SELECT count(*)::int AS n FROM pagos`);
      expect(rows[0]).toEqual({ n: 1 });
    });

    it('un pago se anula con un contramovimiento de monto negativo y motivo', async () => {
      const pago = await pagar({ monto: '5000.00', propina: '500.00' });

      const contra = await pagar({
        monto: '-5000.00',
        propina: '-500.00',
        anula_a_id: pago.id,
        motivo_anulacion: 'Cobrado a la mesa equivocada',
      });

      expect(contra.anula_a_id).toBe(pago.id);
      const { rows } = await pool.query<{ total: string }>(
        `SELECT sum(monto)::text AS total FROM pagos WHERE sesion_id = $1`,
        [a.sesionId],
      );
      expect(rows[0].total).toBe('0.00');
    });

    it('un pago solo se puede anular una vez', async () => {
      const pago = await pagar();
      const contra = { monto: '-5000.00', anula_a_id: pago.id, motivo_anulacion: 'Error' };
      await pagar(contra);

      const error = await errorDe(pagar(contra));

      expect(error.code).toBe(SQLSTATE.violacionUnica);
      expect(error.constraint).toBe('pagos_local_id_anula_a_id_key');
    });

    it('un contramovimiento con monto positivo se rechaza', async () => {
      const pago = await pagar();

      const error = await errorDe(
        pagar({ monto: '5000.00', anula_a_id: pago.id, motivo_anulacion: 'Error' }),
      );

      expect(error.code).toBe(SQLSTATE.violacionCheck);
      expect(error.constraint).toBe('pagos_normal_o_contramovimiento');
    });

    it('un contramovimiento sin motivo se rechaza', async () => {
      const pago = await pagar();

      const error = await errorDe(pagar({ monto: '-5000.00', anula_a_id: pago.id }));

      expect(error.code).toBe(SQLSTATE.violacionCheck);
      expect(error.constraint).toBe('pagos_normal_o_contramovimiento');
    });

    it('un pago normal no puede tener monto cero', async () => {
      const error = await errorDe(pagar({ monto: '0.00' }));

      expect(error.constraint).toBe('pagos_normal_o_contramovimiento');
    });

    it('un pago normal no puede tener propina negativa', async () => {
      const error = await errorDe(pagar({ propina: '-1.00' }));

      expect(error.constraint).toBe('pagos_normal_o_contramovimiento');
    });

    it('un pago normal no puede tener motivo de anulación', async () => {
      const error = await errorDe(pagar({ motivo_anulacion: 'x' }));

      expect(error.constraint).toBe('pagos_normal_o_contramovimiento');
    });

    it('un pago no puede anularse a sí mismo', async () => {
      const datos = datosPago(a.localId, a.sesionId, a.turnoId, a.usuarioId, {
        monto: '-5000.00',
        motivo_anulacion: 'Error',
      });
      datos.anula_a_id = datos.id;

      const error = await errorDe(insertar(pool, 'pagos', datos));

      expect(error.code).toBe(SQLSTATE.violacionCheck);
      expect(error.constraint).toBe('pagos_no_se_anula_a_si_mismo');
    });

    it('un pago en contingencia exige quién lo cargó', async () => {
      const error = await errorDe(pagar({ en_contingencia: true }));

      expect(error.code).toBe(SQLSTATE.violacionCheck);
      expect(error.constraint).toBe('pagos_contingencia_con_carga');
    });

    it('un pago en contingencia con usuario y fecha de carga se acepta', async () => {
      await expect(
        pagar({ en_contingencia: true, cargado_por_id: a.usuarioId, cargado_en: new Date() }),
      ).resolves.toBeDefined();
    });

    it('TRUNCATE de pagos se rechaza (directo o en cascada desde sesiones)', async () => {
      await pagar();

      const directo = await errorDe(pool.query('TRUNCATE pagos'));
      const enCascada = await errorDe(pool.query('TRUNCATE sesiones_mesa CASCADE'));

      expect(directo.code).toBe(SQLSTATE.restrictViolation);
      expect(enCascada.code).toBe(SQLSTATE.restrictViolation);
      const { rows } = await pool.query(`SELECT count(*)::int AS n FROM pagos`);
      expect(rows[0]).toEqual({ n: 1 });
    });

    it('vaciarBase igual puede limpiar pagos y deja el trigger activo', async () => {
      await pagar();

      await vaciarBase(pool);

      const { rows } = await pool.query(`SELECT count(*)::int AS n FROM pagos`);
      expect(rows[0]).toEqual({ n: 0 });
      const trigger = await pool.query<{ tgenabled: string }>(
        `SELECT tgenabled FROM pg_trigger WHERE tgname = 'pagos_sin_truncate'`,
      );
      expect(trigger.rows[0]).toEqual({ tgenabled: 'O' });
    });

    it('los montos se suman sin errores de redondeo', async () => {
      await pagar({ monto: '0.10' });
      await pagar({ monto: '0.20' });

      const { rows } = await pool.query<{ total: string }>(
        `SELECT sum(monto)::text AS total FROM pagos`,
      );
      expect(rows[0].total).toBe('0.30');
    });

    describe('aislamiento entre locales', () => {
      let b: Escenario;
      beforeEach(async () => {
        b = await crearEscenario(pool);
      });

      it('un pago no puede imputarse a un turno de otro local', async () => {
        const error = await errorDe(
          insertar(pool, 'pagos', datosPago(a.localId, a.sesionId, b.turnoId, a.usuarioId)),
        );

        expect(error.code).toBe(SQLSTATE.violacionFk);
        expect(error.constraint).toBe('pagos_local_id_turno_id_fkey');
      });

      it('un pago no puede cobrar una sesión de otro local', async () => {
        const error = await errorDe(
          insertar(pool, 'pagos', datosPago(a.localId, b.sesionId, a.turnoId, a.usuarioId)),
        );

        expect(error.code).toBe(SQLSTATE.violacionFk);
        expect(error.constraint).toBe('pagos_local_id_sesion_id_fkey');
      });

      it('un pago no puede registrarlo un usuario de otro local', async () => {
        const error = await errorDe(
          insertar(pool, 'pagos', datosPago(a.localId, a.sesionId, a.turnoId, b.usuarioId)),
        );

        expect(error.code).toBe(SQLSTATE.violacionFk);
        expect(error.constraint).toBe('pagos_local_id_registrado_por_id_fkey');
      });

      it('un contramovimiento no puede anular un pago de otro local', async () => {
        const pagoDeB = await insertar(
          pool,
          'pagos',
          datosPago(b.localId, b.sesionId, b.turnoId, b.usuarioId),
        );

        const error = await errorDe(
          pagar({ monto: '-5000.00', anula_a_id: pagoDeB.id, motivo_anulacion: 'Error' }),
        );

        expect(error.code).toBe(SQLSTATE.violacionFk);
        expect(error.constraint).toBe('pagos_local_id_anula_a_id_fkey');
      });
    });
  });
});
