import { ArgumentsHost, HttpStatus, NotFoundException } from '@nestjs/common';
import { AppException } from '../exceptions/app.exception';
import type { ApiErrorBody } from '../types/api-error';
import { AllExceptionsFilter } from './all-exceptions.filter';

function crearHost() {
  const json = jest.fn<void, [ApiErrorBody]>();
  const status = jest.fn().mockReturnValue({ json });
  const request = { method: 'GET', originalUrl: '/api/v1/x', requestId: 'req-1' };
  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({ status }),
    }),
  } as unknown as ArgumentsHost;

  return { host, status, body: () => json.mock.calls[0][0] };
}

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  beforeAll(() => {
    jest.spyOn(filter['logger'], 'error').mockImplementation(() => undefined);
  });

  it('serializa AppException con la forma del contrato', () => {
    const { host, status, body } = crearHost();

    filter.catch(
      new AppException({
        status: HttpStatus.CONFLICT,
        codigo: 'PRODUCTO_AGOTADO',
        mensaje: 'El producto está agotado',
        detalles: { productoId: 'p1' },
      }),
      host,
    );

    expect(status).toHaveBeenCalledWith(409);
    expect(body()).toEqual({
      codigo: 'PRODUCTO_AGOTADO',
      mensaje: 'El producto está agotado',
      detalles: { productoId: 'p1' },
      ruta: '/api/v1/x',
      fecha: expect.any(String) as string,
      requestId: 'req-1',
    });
  });

  it('usa detalles null si la excepción no trae', () => {
    const { host, body } = crearHost();

    filter.catch(
      new AppException({ status: HttpStatus.CONFLICT, codigo: 'X', mensaje: 'x' }),
      host,
    );

    expect(body().detalles).toBeNull();
  });

  it('mapea HttpException de Nest a un código genérico', () => {
    const { host, body } = crearHost();

    filter.catch(new NotFoundException('No existe'), host);

    expect(body()).toMatchObject({ codigo: 'NO_ENCONTRADO', mensaje: 'No existe', detalles: null });
  });

  it('oculta los detalles de errores desconocidos', () => {
    const { host, status, body } = crearHost();

    filter.catch(new Error('password=secreto en la query'), host);

    expect(status).toHaveBeenCalledWith(500);
    const resultado = body();
    expect(resultado.codigo).toBe('ERROR_INTERNO');
    expect(JSON.stringify(resultado)).not.toContain('secreto');
    expect(resultado).not.toHaveProperty('stack');
  });
});
