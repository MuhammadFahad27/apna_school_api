import {
  Controller,
  Get,
  HttpCode,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DatabaseHealthService } from './database-health.service.js';
import type { DatabaseHealthResult } from './database-health.service.js';

@Controller('health')
export class DatabaseHealthController {
  constructor(private readonly databaseHealthService: DatabaseHealthService) {}

  @Get('database')
  @HttpCode(200)
  async checkDatabase(): Promise<DatabaseHealthResult> {
    const result = await this.databaseHealthService.check();

    if (result.status === 'down') {
      throw new ServiceUnavailableException(result);
    }

    return result;
  }
}
