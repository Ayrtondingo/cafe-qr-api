/** Formato único de respuesta exitosa de la API. */
export interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Los services devuelven PaginatedResult para listados paginados;
 * el ResponseInterceptor lo transforma en { data, meta }.
 */
export class PaginatedResult<T> {
  readonly meta: PaginationMeta;

  constructor(
    readonly items: T[],
    params: { page: number; limit: number; total: number },
  ) {
    this.meta = {
      page: params.page,
      limit: params.limit,
      total: params.total,
      totalPages: params.limit > 0 ? Math.ceil(params.total / params.limit) : 0,
    };
  }

  /** Transforma los ítems conservando la paginación (ej. entidad -> DTO de respuesta). */
  map<U>(mapper: (item: T) => U): PaginatedResult<U> {
    return new PaginatedResult(this.items.map(mapper), this.meta);
  }
}
