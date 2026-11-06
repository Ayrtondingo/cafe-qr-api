import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Response } from 'express';
import { requestStorage } from '../request/request-storage';
import type { AppRequest } from '../types/request-context';

export const REQUEST_ID_HEADER = 'x-request-id';

// Solo se reutiliza el ID entrante si es corto y seguro para logs.
const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{8,128}$/;

/** Asigna un ID de correlación a cada request (log, errores, soporte). */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(request: AppRequest, response: Response, next: NextFunction): void {
    const incoming = request.header(REQUEST_ID_HEADER);
    const requestId = incoming && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();

    request.requestId = requestId;
    response.setHeader(REQUEST_ID_HEADER, requestId);
    // El resto del request corre con el request disponible para la auditoría.
    requestStorage.run(request, next);
  }
}
