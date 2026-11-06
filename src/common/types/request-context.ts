import type { Request } from 'express';

/** Request de Express enriquecido por los middlewares de la API. */
export interface AppRequest extends Request {
  requestId?: string;
}

/** Datos del cliente HTTP (sesiones y auditoría, en tareas siguientes). */
export interface ClientInfo {
  ip: string | null;
  userAgent: string | null;
}
