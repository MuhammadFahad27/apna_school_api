import {
  Controller,
  Get,
  HttpCode,
  ServiceUnavailableException,
} from '@nestjs/common';
import { CloudinaryHealthService } from './cloudinary-health.service.js';
import type { CloudinaryHealthResult } from './cloudinary-health.service.js';

@Controller('health')
export class CloudinaryHealthController {
  constructor(
    private readonly cloudinaryHealthService: CloudinaryHealthService,
  ) {}

  @Get('cloudinary')
  @HttpCode(200)
  async checkCloudinary(): Promise<CloudinaryHealthResult> {
    const result = await this.cloudinaryHealthService.check();

    if (result.status === 'down') {
      throw new ServiceUnavailableException(result);
    }

    return result;
  }
}
