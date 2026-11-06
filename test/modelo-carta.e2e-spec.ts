import type { Pool } from 'pg';
import { conectarBaseDeTest, vaciarBase } from './utils/base-de-test';
import {
  SQLSTATE,
  crearCategoria,
  crearGrupoOpciones,
  crearLocal,
  crearOpcion,
  crearProducto,
  crearUsuario,
  errorDe,
  insertar,
} from './utils/fixtures';

/** Restricciones de carta y configuración del local contra PostgreSQL real. */
describe('Modelo de carta y configuración (e2e, PostgreSQL)', () => {
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

  describe('productos', () => {
    it('el precio de un producto no puede ser negativo', async () => {
      const local = await crearLocal(pool);

      const error = await errorDe(crearProducto(pool, local, { precio: '-0.01' }));

      expect(error.code).toBe(SQLSTATE.violacionCheck);
      expect(error.constraint).toBe('productos_precio_no_negativo');
    });

    it('un precio con centavos vuelve exacto de la base (sin float)', async () => {
      const local = await crearLocal(pool);
      const producto = await crearProducto(pool, local, { precio: '1234.56' });

      const { rows } = await pool.query<{ precio: string }>(
        `SELECT precio FROM productos WHERE id = $1`,
        [producto],
      );

      expect(rows[0].precio).toBe('1234.56');
    });

    it('no se puede crear un producto en una categoría de otro local', async () => {
      const localA = await crearLocal(pool);
      const localB = await crearLocal(pool);
      const categoriaDeB = await crearCategoria(pool, localB);

      const error = await errorDe(crearProducto(pool, localA, { categoria_id: categoriaDeB }));

      expect(error.code).toBe(SQLSTATE.violacionFk);
      expect(error.constraint).toBe('productos_local_id_categoria_id_fkey');
    });
  });

  describe('opciones', () => {
    it('un grupo no puede exigir más elecciones como mínimo que su máximo', async () => {
      const local = await crearLocal(pool);
      const producto = await crearProducto(pool, local);

      const error = await errorDe(
        crearGrupoOpciones(pool, local, producto, { min_elegidas: 2, max_elegidas: 1 }),
      );

      expect(error.code).toBe(SQLSTATE.violacionCheck);
      expect(error.constraint).toBe('grupos_opciones_min_max');
    });

    it('un grupo con máximo cero se rechaza', async () => {
      const local = await crearLocal(pool);
      const producto = await crearProducto(pool, local);

      const error = await errorDe(
        crearGrupoOpciones(pool, local, producto, { min_elegidas: 0, max_elegidas: 0 }),
      );

      expect(error.constraint).toBe('grupos_opciones_min_max');
    });

    it('el recargo de una opción no puede ser negativo', async () => {
      const local = await crearLocal(pool);
      const grupo = await crearGrupoOpciones(pool, local, await crearProducto(pool, local));

      const error = await errorDe(crearOpcion(pool, local, grupo, { recargo: '-1.00' }));

      expect(error.code).toBe(SQLSTATE.violacionCheck);
      expect(error.constraint).toBe('opciones_producto_recargo_no_negativo');
    });

    it('un grupo no puede colgar de un producto de otro local', async () => {
      const localA = await crearLocal(pool);
      const localB = await crearLocal(pool);
      const productoDeB = await crearProducto(pool, localB);

      const error = await errorDe(crearGrupoOpciones(pool, localA, productoDeB));

      expect(error.code).toBe(SQLSTATE.violacionFk);
      expect(error.constraint).toBe('grupos_opciones_local_id_producto_id_fkey');
    });
  });

  describe('configuración del local', () => {
    const configurar = (localId: string, extra: Record<string, unknown> = {}) =>
      insertar(pool, 'configuracion_local', {
        local_id: localId,
        actualizado_en: new Date(),
        ...extra,
      });

    it('pausar los pedidos por QR exige quién los pausó', async () => {
      const local = await crearLocal(pool);

      const error = await errorDe(
        configurar(local, { pedidos_qr_pausados: true, pausado_en: new Date() }),
      );

      expect(error.code).toBe(SQLSTATE.violacionCheck);
      expect(error.constraint).toBe('configuracion_local_pausa_completa');
    });

    it('la pausa la tiene que hacer un usuario del mismo local', async () => {
      const local = await crearLocal(pool);
      const otro = await crearLocal(pool);
      const usuarioDeOtro = await crearUsuario(pool, otro);

      const error = await errorDe(
        configurar(local, {
          pedidos_qr_pausados: true,
          pausado_por_id: usuarioDeOtro,
          pausado_en: new Date(),
        }),
      );

      expect(error.code).toBe(SQLSTATE.violacionFk);
      expect(error.constraint).toBe('configuracion_local_local_id_pausado_por_id_fkey');
    });

    it('el umbral de señal de la barra tiene que ser mayor que cero', async () => {
      const local = await crearLocal(pool);

      const error = await errorDe(configurar(local, { umbral_senal_barra_seg: 0 }));

      expect(error.code).toBe(SQLSTATE.violacionCheck);
      expect(error.constraint).toBe('configuracion_local_umbral_positivo');
    });

    it('la configuración por defecto es válida (sin pausa, umbral 30 s, sin aprobación)', async () => {
      const local = await crearLocal(pool);

      const fila = await configurar(local);

      expect(fila).toMatchObject({
        pedidos_qr_pausados: false,
        umbral_senal_barra_seg: 30,
        aprobacion_hora_pico: false,
      });
    });
  });
});
