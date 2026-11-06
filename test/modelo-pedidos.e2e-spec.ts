import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { conectarBaseDeTest, vaciarBase } from './utils/base-de-test';
import {
  SQLSTATE,
  crearEscenario,
  crearGrupoOpciones,
  crearOpcion,
  crearPedido,
  crearProducto,
  datosItem,
  datosPedido,
  errorDe,
  insertar,
  type Escenario,
} from './utils/fixtures';

/** Restricciones del modelo de pedidos (pedidos, ítems, opciones elegidas) contra PostgreSQL real. */
describe('Modelo de pedidos (e2e, PostgreSQL)', () => {
  let pool: Pool;
  let a: Escenario;
  let b: Escenario;

  beforeAll(() => {
    pool = conectarBaseDeTest();
  });
  afterAll(async () => {
    await pool.end();
  });
  beforeEach(async () => {
    await vaciarBase(pool);
    a = await crearEscenario(pool);
    b = await crearEscenario(pool);
  });

  describe('idempotencia', () => {
    it('la misma clave de idempotencia en el mismo local crea un solo pedido', async () => {
      const clave = randomUUID();
      await crearPedido(pool, a.localId, a.sesionId, { clave_idempotencia: clave });

      const error = await errorDe(
        crearPedido(pool, a.localId, a.sesionId, { clave_idempotencia: clave }),
      );

      expect(error.code).toBe(SQLSTATE.violacionUnica);
      expect(error.constraint).toBe('pedidos_local_id_clave_idempotencia_key');
      const { rows } = await pool.query(
        `SELECT count(*)::int AS n FROM pedidos WHERE clave_idempotencia = $1`,
        [clave],
      );
      expect(rows[0]).toEqual({ n: 1 });
    });

    it('la misma clave de idempotencia en otro local se acepta', async () => {
      const clave = randomUUID();
      await crearPedido(pool, a.localId, a.sesionId, { clave_idempotencia: clave });

      await expect(
        crearPedido(pool, b.localId, b.sesionId, { clave_idempotencia: clave }),
      ).resolves.toEqual(expect.any(String));
    });
  });

  describe('aislamiento entre locales', () => {
    it('no se puede crear un pedido en una sesión de otro local', async () => {
      const error = await errorDe(crearPedido(pool, a.localId, b.sesionId));

      expect(error.code).toBe(SQLSTATE.violacionFk);
      expect(error.constraint).toBe('pedidos_local_id_sesion_id_fkey');
    });

    it('un pedido no puede ser confirmado por un usuario de otro local', async () => {
      const error = await errorDe(
        crearPedido(pool, a.localId, a.sesionId, {
          estado: 'CONFIRMADO',
          confirmado_por_id: b.usuarioId,
          confirmado_en: new Date(),
        }),
      );

      expect(error.code).toBe(SQLSTATE.violacionFk);
      expect(error.constraint).toBe('pedidos_local_id_confirmado_por_id_fkey');
    });

    it('un pedido no puede ser cargado por un usuario de otro local', async () => {
      const error = await errorDe(
        crearPedido(pool, a.localId, a.sesionId, { origen: 'MOZO', cargado_por_id: b.usuarioId }),
      );

      expect(error.code).toBe(SQLSTATE.violacionFk);
      expect(error.constraint).toBe('pedidos_local_id_cargado_por_id_fkey');
    });

    it('un pedido no puede ser anulado por un usuario de otro local', async () => {
      const error = await errorDe(
        crearPedido(pool, a.localId, a.sesionId, {
          estado: 'ANULADO',
          anulado_por_id: b.usuarioId,
          anulado_en: new Date(),
          motivo_anulacion: 'Error de carga',
        }),
      );

      expect(error.code).toBe(SQLSTATE.violacionFk);
      expect(error.constraint).toBe('pedidos_local_id_anulado_por_id_fkey');
    });

    it('un ítem no puede usar un producto de otro local', async () => {
      const pedido = await crearPedido(pool, a.localId, a.sesionId);

      const error = await errorDe(
        insertar(pool, 'pedido_items', datosItem(a.localId, pedido, b.productoId)),
      );

      expect(error.code).toBe(SQLSTATE.violacionFk);
      expect(error.constraint).toBe('pedido_items_local_id_producto_id_fkey');
    });

    it('un ítem no puede colgar de un pedido de otro local', async () => {
      const pedidoDeB = await crearPedido(pool, b.localId, b.sesionId);

      const error = await errorDe(
        insertar(pool, 'pedido_items', datosItem(a.localId, pedidoDeB, a.productoId)),
      );

      expect(error.code).toBe(SQLSTATE.violacionFk);
      expect(error.constraint).toBe('pedido_items_local_id_pedido_id_fkey');
    });

    it('una opción elegida no puede ser de otro local', async () => {
      const pedido = await crearPedido(pool, a.localId, a.sesionId);
      const item = await insertar(pool, 'pedido_items', datosItem(a.localId, pedido, a.productoId));
      const grupoDeB = await crearGrupoOpciones(pool, b.localId, b.productoId);
      const opcionDeB = await crearOpcion(pool, b.localId, grupoDeB);

      const error = await errorDe(
        insertar(pool, 'pedido_item_opciones', {
          id: randomUUID(),
          local_id: a.localId,
          pedido_item_id: item.id,
          opcion_id: opcionDeB,
          nombre_grupo: 'Leche',
          nombre_opcion: 'Almendras',
          recargo: '500.00',
        }),
      );

      expect(error.code).toBe(SQLSTATE.violacionFk);
      expect(error.constraint).toBe('pedido_item_opciones_local_id_opcion_id_fkey');
    });
  });

  describe('reglas del pedido', () => {
    it('un pedido anulado exige motivo', async () => {
      const error = await errorDe(
        crearPedido(pool, a.localId, a.sesionId, {
          estado: 'ANULADO',
          anulado_por_id: a.usuarioId,
          anulado_en: new Date(),
        }),
      );

      expect(error.code).toBe(SQLSTATE.violacionCheck);
      expect(error.constraint).toBe('pedidos_anulacion_completa');
    });

    it('un pedido anulado con motivo, usuario y fecha se acepta', async () => {
      await expect(
        crearPedido(pool, a.localId, a.sesionId, {
          estado: 'ANULADO',
          anulado_por_id: a.usuarioId,
          anulado_en: new Date(),
          motivo_anulacion: 'El cliente se fue',
        }),
      ).resolves.toEqual(expect.any(String));
    });

    it('un pedido no anulado no puede tener motivo de anulación', async () => {
      const error = await errorDe(
        crearPedido(pool, a.localId, a.sesionId, {
          estado: 'CONFIRMADO',
          anulado_por_id: a.usuarioId,
          anulado_en: new Date(),
          motivo_anulacion: 'x',
        }),
      );

      expect(error.constraint).toBe('pedidos_anulacion_completa');
    });

    it('un pedido en contingencia exige quién lo cargó', async () => {
      const error = await errorDe(
        crearPedido(pool, a.localId, a.sesionId, { en_contingencia: true }),
      );

      expect(error.code).toBe(SQLSTATE.violacionCheck);
      expect(error.constraint).toBe('pedidos_contingencia_con_carga');
    });

    it('un pedido en contingencia con usuario y fecha de carga se acepta', async () => {
      await expect(
        crearPedido(pool, a.localId, a.sesionId, {
          origen: 'MOZO',
          en_contingencia: true,
          cargado_por_id: a.usuarioId,
          cargado_en: new Date(),
        }),
      ).resolves.toEqual(expect.any(String));
    });

    it('un pedido cargado por el mozo exige quién lo cargó', async () => {
      const error = await errorDe(crearPedido(pool, a.localId, a.sesionId, { origen: 'MOZO' }));

      expect(error.code).toBe(SQLSTATE.violacionCheck);
      expect(error.constraint).toBe('pedidos_mozo_con_carga');
    });

    it('un pedido por QR no necesita usuario que lo cargue', async () => {
      await expect(
        insertar(pool, 'pedidos', datosPedido(a.localId, a.sesionId, { origen: 'QR' })),
      ).resolves.toBeDefined();
    });
  });

  describe('ítems', () => {
    it('la cantidad de un ítem tiene que ser mayor que cero', async () => {
      const pedido = await crearPedido(pool, a.localId, a.sesionId);

      const error = await errorDe(
        insertar(pool, 'pedido_items', datosItem(a.localId, pedido, a.productoId, { cantidad: 0 })),
      );

      expect(error.code).toBe(SQLSTATE.violacionCheck);
      expect(error.constraint).toBe('pedido_items_cantidad_positiva');
    });

    it('el precio unitario copiado no puede ser negativo', async () => {
      const pedido = await crearPedido(pool, a.localId, a.sesionId);

      const error = await errorDe(
        insertar(
          pool,
          'pedido_items',
          datosItem(a.localId, pedido, a.productoId, { precio_unitario: '-1.00' }),
        ),
      );

      expect(error.constraint).toBe('pedido_items_precio_no_negativo');
    });

    it('un ítem anulado exige motivo', async () => {
      const pedido = await crearPedido(pool, a.localId, a.sesionId);

      const error = await errorDe(
        insertar(
          pool,
          'pedido_items',
          datosItem(a.localId, pedido, a.productoId, {
            estado: 'ANULADO',
            anulado_por_id: a.usuarioId,
            anulado_en: new Date(),
          }),
        ),
      );

      expect(error.constraint).toBe('pedido_items_anulacion_completa');
    });

    it('cambiar el precio del producto no altera el precio de un ítem ya pedido', async () => {
      const producto = await crearProducto(pool, a.localId, { precio: '2500.00' });
      const pedido = await crearPedido(pool, a.localId, a.sesionId);
      const item = await insertar(
        pool,
        'pedido_items',
        datosItem(a.localId, pedido, producto, { precio_unitario: '2500.00' }),
      );

      await pool.query(`UPDATE productos SET precio = '3000.00' WHERE id = $1`, [producto]);

      const { rows } = await pool.query<{ precio_unitario: string }>(
        `SELECT precio_unitario FROM pedido_items WHERE id = $1`,
        [item.id],
      );
      expect(rows[0].precio_unitario).toBe('2500.00');
    });

    it('el recargo copiado de una opción no puede ser negativo', async () => {
      const pedido = await crearPedido(pool, a.localId, a.sesionId);
      const item = await insertar(pool, 'pedido_items', datosItem(a.localId, pedido, a.productoId));
      const grupo = await crearGrupoOpciones(pool, a.localId, a.productoId);
      const opcion = await crearOpcion(pool, a.localId, grupo);

      const error = await errorDe(
        insertar(pool, 'pedido_item_opciones', {
          id: randomUUID(),
          local_id: a.localId,
          pedido_item_id: item.id,
          opcion_id: opcion,
          nombre_grupo: 'Leche',
          nombre_opcion: 'Almendras',
          recargo: '-0.01',
        }),
      );

      expect(error.constraint).toBe('pedido_item_opciones_recargo_no_negativo');
    });
  });
});
