import { HttpException, HttpStatus } from '@nestjs/common';

export type DetallesError = Record<string, unknown>;

export interface AppExceptionParams {
  status: HttpStatus;
  codigo: string;
  mensaje: string;
  detalles?: DetallesError;
}

/**
 * Excepción base de la aplicación. Toda regla de negocio que falle lanza una AppException
 * con un código estable que la web pueda interpretar.
 *
 * @example
 * throw new AppException({
 *   status: HttpStatus.CONFLICT,
 *   codigo: 'PRODUCTO_AGOTADO',
 *   mensaje: 'El producto está agotado',
 * });
 */
export class AppException extends HttpException {
  readonly codigo: string;
  readonly detalles: DetallesError | null;

  constructor({ status, codigo, mensaje, detalles }: AppExceptionParams) {
    super(mensaje, status);
    this.codigo = codigo;
    this.detalles = detalles ?? null;
  }
}
