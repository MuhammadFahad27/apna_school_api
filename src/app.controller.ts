import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health/server')
  getServerHealth() {
    return {
      status: 'up',
      service: 'farm_dost_backend',
      environment: process.env.NODE_ENV ?? 'production',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }

  @Get('health')
  getApplicationHealth() {
    return {
      status: 'up',
      service: 'farm_dost_backend',
      message: 'Backend is running successfully',
      timestamp: new Date().toISOString(),
    };
  }
}
