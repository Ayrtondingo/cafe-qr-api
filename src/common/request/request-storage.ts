import { AsyncLocalStorage } from 'node:async_hooks';
import type { AppRequest, ClientInfo } from '../types/request-context';

/**
 * Request HTTP en curso para el flujo asíncrono actual (lo asigna RequestIdMiddleware).
 * Permite a la auditoría conocer IP, user agent y request id sin recibirlos
 * por parámetro en cada capa. Fuera de un request (tareas internas) no hay valor.
 */
export const requestStorage = new AsyncLocalStorage<AppRequest>();

export function currentRequest(): AppRequest | undefined {
  return requestStorage.getStore();
}

/** IP (real, detrás de Nginx: trust proxy) y user agent del cliente. */
export function clientInfoOf(request: AppRequest): ClientInfo {
  const userAgent = request.header('user-agent');
  return {
    ip: request.ip ?? null,
    userAgent: userAgent ? userAgent.slice(0, 512) : null,
  };
}
