import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import type { HealthResponseDto } from './dto/health-response.dto';
import { HealthService } from './health.service';

/** Público: lo usan el healthcheck de Docker y el monitoreo. */
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /** 200 si la base responde; 503 con el mismo cuerpo si no (docs/api/contratos.md). */
  @Get()
  async check(@Res({ passthrough: true }) response: Response): Promise<HealthResponseDto> {
    const health = await this.healthService.check();
    if (health.base !== 'ok') response.status(HttpStatus.SERVICE_UNAVAILABLE);
    return health;
  }
}
