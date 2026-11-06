import { HttpStatus, ValidationError, ValidationPipe } from '@nestjs/common';
import { AppException } from '../exceptions/app.exception';
import { CodigoErrorComun } from '../exceptions/error-codes';

export interface ErrorDeCampo {
  campo: string;
  errores: string[];
}

/** Aplana errores anidados de class-validator, ej: "items.0.cantidad". */
export function aplanarErroresDeValidacion(errors: ValidationError[], padre = ''): ErrorDeCampo[] {
  return errors.flatMap((error) => {
    const campo = padre ? `${padre}.${error.property}` : error.property;
    const propios: ErrorDeCampo[] = error.constraints
      ? [{ campo, errores: Object.values(error.constraints) }]
      : [];
    return [...propios, ...aplanarErroresDeValidacion(error.children ?? [], campo)];
  });
}

/**
 * ValidationPipe global:
 * - whitelist + forbidNonWhitelisted: rechaza propiedades desconocidas (por ejemplo, un
 *   `localId` mandado por el cliente: el local sale del usuario o de la sesión de mesa).
 * - transform: convierte el payload en instancias del DTO.
 * - Errores en el formato del contrato con código VALIDACION.
 */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors: ValidationError[]) =>
      new AppException({
        status: HttpStatus.BAD_REQUEST,
        codigo: CodigoErrorComun.VALIDACION,
        mensaje: 'Los datos enviados no son válidos',
        detalles: { campos: aplanarErroresDeValidacion(errors) },
      }),
  });
}
