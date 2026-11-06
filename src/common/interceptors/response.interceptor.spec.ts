import { StreamableFile } from '@nestjs/common';
import { PaginatedResult } from '../types/api-response';
import { wrapResponse } from './response.interceptor';

describe('wrapResponse', () => {
  it('envuelve objetos en { data }', () => {
    expect(wrapResponse({ id: 1 })).toEqual({ data: { id: 1 } });
  });

  it('envuelve resultados paginados en { data, meta }', () => {
    const result = new PaginatedResult([{ id: 1 }, { id: 2 }], { page: 1, limit: 2, total: 5 });

    expect(wrapResponse(result)).toEqual({
      data: [{ id: 1 }, { id: 2 }],
      meta: { page: 1, limit: 2, total: 5, totalPages: 3 },
    });
  });

  it('no envuelve archivos ni respuestas vacías', () => {
    const file = new StreamableFile(Buffer.from('csv'));

    expect(wrapResponse(file)).toBe(file);
    expect(wrapResponse(undefined)).toBeUndefined();
  });
});
