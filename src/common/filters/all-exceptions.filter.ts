import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { AppException } from '../exceptions/app.exception';
import { CodigoErrorComun } from '../exceptions/error-codes';
import type { ApiErrorBody } from '../types/api-error';
import type { AppRequest } from '../types/request-context';

type ErrorResuelto = Pick<ApiErrorBody, 'codigo' | 'mensaje' | 'detalles'> & { status: number };

const CODIGO_POR_STATUS: Partial<Record<number, CodigoErrorComun>> = {
  [HttpStatus.BAD_REQUEST]: CodigoErrorComun.SOLICITUD_INVALIDA,
  [HttpStatus.UNAUTHORIZED]: CodigoErrorComun.NO_AUTENTICADO,
  [HttpStatus.FORBIDDEN]: CodigoErrorComun.PROHIBIDO,
  [HttpStatus.NOT_FOUND]: CodigoErrorComun.NO_ENCONTRADO,
  [HttpStatus.CONFLICT]: CodigoErrorComun.CONFLICTO,
  [HttpStatus.PAYLOAD_TOO_LARGE]: CodigoErrorComun.CONTENIDO_DEMASIADO_GRANDE,
  [HttpStatus.TOO_MANY_REQUESTS]: CodigoErrorComun.DEMASIADAS_SOLICITUDES,
};

const MENSAJE_ERROR_INTERNO = 'Ocurrió un error interno. Intente nuevamente más tarde.';

/**
 * Errores del parser del body (body-parser de Express): llegan como Error con `status` y
 * `type` (ej. "entity.too.large", "entity.parse.failed"), no como HttpException. Son errores
 * del cliente: sin esto se responderían como 500.
 */
function errorDelParser(exception: unknown): ErrorResuelto | null {
  if (!(exception instanceof Error)) return null;
  const { status, type } = exception as Error & { status?: unknown; type?: unknown };
  if (typeof type !== 'string' || typeof status !== 'number' || status < 400 || status >= 500) {
    return null;
  }
  const mensaje =
    status === Number(HttpStatus.PAYLOAD_TOO_LARGE)
      ? 'El contenido enviado es demasiado grande'
      : type === 'entity.parse.failed'
        ? 'El cuerpo de la solicitud no es un JSON válido'
        : 'Solicitud inválida';
  return {
    status,
    codigo: CODIGO_POR_STATUS[status] ?? CodigoErrorComun.SOLICITUD_INVALIDA,
    mensaje,
    detalles: null,
  };
}

/**
 * Filtro global: convierte cualquier excepción al formato ApiErrorBody. Nunca expone stack
 * traces ni mensajes internos al cliente; los errores 5xx se registran completos en el log.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<AppRequest>();
    const response = http.getResponse<Response>();

    const { status, ...resuelto } = this.resolver(exception);

    if (status >= 500) {
      const resumen = `[${request.requestId ?? '-'}] ${request.method} ${request.originalUrl} -> ${status} ${resuelto.codigo}`;
      // Las AppException 5xx son fallas previstas (ej. dependencia caída): sin stack.
      if (exception instanceof AppException) {
        this.logger.error(`${resumen}: ${exception.message}`);
      } else {
        this.logger.error(
          resumen,
          exception instanceof Error ? exception.stack : String(exception),
        );
      }
    }

    const body: ApiErrorBody = {
      ...resuelto,
      ruta: request.originalUrl,
      fecha: new Date().toISOString(),
      requestId: request.requestId,
    };

    response.status(status).json(body);
  }

  private resolver(exception: unknown): ErrorResuelto {
    if (exception instanceof AppException) {
      return {
        status: exception.getStatus(),
        codigo: exception.codigo,
        mensaje: exception.message,
        detalles: exception.detalles,
      };
    }

    if (exception instanceof HttpException && exception.getStatus() < 500) {
      const status = exception.getStatus();
      return {
        status,
        codigo: CODIGO_POR_STATUS[status] ?? CodigoErrorComun.SOLICITUD_INVALIDA,
        mensaje: this.extraerMensaje(exception),
        detalles: null,
      };
    }

    const delParser = errorDelParser(exception);
    if (delParser) return delParser;

    const status: number =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    return {
      status,
      codigo:
        status === Number(HttpStatus.SERVICE_UNAVAILABLE)
          ? CodigoErrorComun.SERVICIO_NO_DISPONIBLE
          : CodigoErrorComun.ERROR_INTERNO,
      mensaje: MENSAJE_ERROR_INTERNO,
      detalles: null,
    };
  }

  private extraerMensaje(exception: HttpException): string {
    const response = exception.getResponse();
    if (typeof response === 'string') return response;
    if (typeof response === 'object' && response !== null && 'message' in response) {
      const { message } = response;
      if (typeof message === 'string') return message;
      if (Array.isArray(message)) return message.map(String).join('; ');
    }
    return exception.message;
  }
}
