import type { DetallesError } from '../exceptions/app.exception';

/** Formato único de error devuelto por la API (docs/api/contratos.md → Convenciones). */
export interface ApiErrorBody {
  /** Código estable para que la web lo traduzca, ej. PRODUCTO_AGOTADO. */
  codigo: string;
  /** Texto legible para logs y soporte; la web no lo muestra tal cual. */
  mensaje: string;
  /** Datos extra (ej. errores de validación por campo); null si no hay. */
  detalles: DetallesError | null;
  ruta: string;
  /** ISO 8601. */
  fecha: string;
  requestId?: string;
}
