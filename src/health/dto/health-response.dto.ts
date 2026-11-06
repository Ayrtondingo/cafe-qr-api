/** Respuesta de GET /api/v1/health (docs/api/contratos.md). */
export interface HealthResponseDto {
  estado: 'ok' | 'degradado';
  base: 'ok' | 'caida';
  /** Versión de la API (package.json). */
  version: string;
  /** ISO 8601. */
  fecha: string;
}
