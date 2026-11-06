import { Injectable } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { HealthResponseDto } from './dto/health-response.dto';
import { DatabaseHealthRepository } from './repositories/database-health.repository';

/** Versión del package.json (misma ruta relativa desde src/ y desde dist/). */
function leerVersion(): string {
  try {
    const raw = readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf8');
    return (JSON.parse(raw) as { version?: string }).version ?? 'desconocida';
  } catch {
    return 'desconocida';
  }
}

const VERSION = leerVersion();

@Injectable()
export class HealthService {
  constructor(private readonly databaseHealth: DatabaseHealthRepository) {}

  async check(now = new Date()): Promise<HealthResponseDto> {
    const baseOk = await this.databaseHealth.ping();
    return {
      estado: baseOk ? 'ok' : 'degradado',
      base: baseOk ? 'ok' : 'caida',
      version: VERSION,
      fecha: now.toISOString(),
    };
  }
}
