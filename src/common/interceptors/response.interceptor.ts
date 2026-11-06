import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { ApiResponse, PaginatedResult } from '../types/api-response';

/**
 * Envuelve toda respuesta exitosa en { data } o { data, meta } para listados
 * paginados. Archivos (StreamableFile) y respuestas vacías no se envuelven.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<unknown> | StreamableFile | undefined
> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<unknown> | StreamableFile | undefined> {
    return next.handle().pipe(map((value) => wrapResponse(value)));
  }
}

export function wrapResponse(value: unknown): ApiResponse<unknown> | StreamableFile | undefined {
  if (value === undefined || value instanceof StreamableFile) {
    return value;
  }
  if (value instanceof PaginatedResult) {
    return { data: value.items as unknown[], meta: value.meta };
  }
  return { data: value };
}
